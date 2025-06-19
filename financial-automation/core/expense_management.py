#!/usr/bin/env python3
"""
Expense Management System - Automated Financial Management
Implements automated expense tracking, approval workflows, and cost control
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, asdict
from enum import Enum
import uuid

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ExpenseCategory(Enum):
    OFFICE_SUPPLIES = "office_supplies"
    MARKETING = "marketing"
    TRAVEL = "travel"
    SOFTWARE = "software"
    HARDWARE = "hardware"
    MEALS = "meals"
    UTILITIES = "utilities"
    LEGAL = "legal"
    PROFESSIONAL_SERVICES = "professional_services"
    ADVERTISING = "advertising"
    OTHER = "other"

class ExpenseStatus(Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    REJECTED = "rejected"
    PAID = "paid"
    REIMBURSED = "reimbursed"

class ApprovalLevel(Enum):
    NONE = "none"
    MANAGER = "manager"
    FINANCE = "finance"
    EXECUTIVE = "executive"

@dataclass
class ExpenseItem:
    """Individual expense item"""
    item_id: str
    description: str
    amount: Decimal
    category: ExpenseCategory
    date: datetime
    vendor: Optional[str] = None
    receipt_url: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage"""
        data = asdict(self)
        data['amount'] = str(data['amount'])
        data['category'] = data['category'].value
        data['date'] = data['date'].isoformat()
        return data

@dataclass
class ExpenseReport:
    """Expense report containing multiple items"""
    report_id: str
    employee_id: str
    department: str
    title: str
    items: List[ExpenseItem]
    total_amount: Decimal
    status: ExpenseStatus
    submitted_date: Optional[datetime] = None
    approved_date: Optional[datetime] = None
    approved_by: Optional[str] = None
    rejection_reason: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage"""
        data = asdict(self)
        data['items'] = [item.to_dict() for item in data['items']]
        data['total_amount'] = str(data['total_amount'])
        data['status'] = data['status'].value
        if data['submitted_date']:
            data['submitted_date'] = data['submitted_date'].isoformat()
        if data['approved_date']:
            data['approved_date'] = data['approved_date'].isoformat()
        return data

class ExpenseManagementEngine:
    """Core expense management automation engine"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.expense_reports: List[ExpenseReport] = []
        self.approval_rules = self._load_approval_rules()
        self.budget_limits = self._load_budget_limits()
        self.vendor_manager = VendorManager(config.get('vendor', {}))
        self.receipt_processor = ReceiptProcessor(config.get('receipt', {}))
        
    def _load_approval_rules(self) -> Dict[str, Any]:
        """Load expense approval rules"""
        return {
            'thresholds': {
                'manager': Decimal('500.00'),
                'finance': Decimal('2000.00'),
                'executive': Decimal('10000.00')
            },
            'category_rules': {
                ExpenseCategory.MARKETING.value: {
                    'auto_approve_limit': Decimal('200.00'),
                    'required_approval': ApprovalLevel.MANAGER.value
                },
                ExpenseCategory.TRAVEL.value: {
                    'auto_approve_limit': Decimal('1000.00'),
                    'required_approval': ApprovalLevel.FINANCE.value
                },
                ExpenseCategory.OFFICE_SUPPLIES.value: {
                    'auto_approve_limit': Decimal('100.00'),
                    'required_approval': ApprovalLevel.NONE.value
                }
            },
            'auto_approval_enabled': self.config.get('auto_approval', True)
        }
    
    def _load_budget_limits(self) -> Dict[str, Any]:
        """Load department budget limits"""
        return {
            'engineering': {
                'monthly_limit': Decimal('25000.00'),
                'quarterly_limit': Decimal('75000.00'),
                'categories': {
                    'software': Decimal('5000.00'),
                    'hardware': Decimal('15000.00')
                }
            },
            'marketing': {
                'monthly_limit': Decimal('50000.00'),
                'quarterly_limit': Decimal('150000.00'),
                'categories': {
                    'advertising': Decimal('40000.00'),
                    'marketing': Decimal('10000.00')
                }
            },
            'operations': {
                'monthly_limit': Decimal('10000.00'),
                'quarterly_limit': Decimal('30000.00')
            }
        }
    
    async def create_expense_report(self, report_data: Dict[str, Any]) -> ExpenseReport:
        """Create new expense report"""
        try:
            report = self._create_report_from_data(report_data)
            
            # Process receipts if provided
            if report_data.get('receipts'):
                await self._process_receipts(report, report_data['receipts'])
            
            # Validate against budget limits
            await self._validate_budget_limits(report)
            
            # Store report
            self.expense_reports.append(report)
            
            # Store in memory
            await self._store_in_memory(report)
            
            logger.info(f"Created expense report: {report.report_id}")
            return report
            
        except Exception as e:
            logger.error(f"Error creating expense report: {e}")
            raise
    
    def _create_report_from_data(self, data: Dict[str, Any]) -> ExpenseReport:
        """Create expense report from input data"""
        items = []
        total_amount = Decimal('0')
        
        for item_data in data.get('items', []):
            item = ExpenseItem(
                item_id=item_data.get('item_id', str(uuid.uuid4())),
                description=item_data['description'],
                amount=Decimal(str(item_data['amount'])),
                category=ExpenseCategory(item_data['category']),
                date=datetime.fromisoformat(item_data['date']) if isinstance(item_data['date'], str) else item_data['date'],
                vendor=item_data.get('vendor'),
                receipt_url=item_data.get('receipt_url'),
                metadata=item_data.get('metadata', {})
            )
            items.append(item)
            total_amount += item.amount
        
        return ExpenseReport(
            report_id=data.get('report_id', str(uuid.uuid4())),
            employee_id=data['employee_id'],
            department=data['department'],
            title=data['title'],
            items=items,
            total_amount=total_amount,
            status=ExpenseStatus.DRAFT,
            metadata=data.get('metadata', {})
        )
    
    async def _process_receipts(self, report: ExpenseReport, receipts: List[str]):
        """Process receipt images and extract data"""
        for i, receipt_url in enumerate(receipts):
            if i < len(report.items):
                extracted_data = await self.receipt_processor.process_receipt(receipt_url)
                
                # Update item with extracted data
                item = report.items[i]
                if extracted_data.get('amount'):
                    # Verify amount matches
                    extracted_amount = Decimal(str(extracted_data['amount']))
                    if abs(item.amount - extracted_amount) > Decimal('0.01'):
                        logger.warning(f"Receipt amount mismatch: {item.amount} vs {extracted_amount}")
                
                item.receipt_url = receipt_url
                item.metadata = item.metadata or {}
                item.metadata['receipt_data'] = extracted_data
    
    async def _validate_budget_limits(self, report: ExpenseReport):
        """Validate expense report against budget limits"""
        department_limits = self.budget_limits.get(report.department, {})
        
        if not department_limits:
            logger.warning(f"No budget limits defined for department: {report.department}")
            return
        
        # Check monthly limit
        monthly_spent = await self._calculate_monthly_spending(report.department)
        monthly_limit = department_limits.get('monthly_limit', Decimal('0'))
        
        if monthly_spent + report.total_amount > monthly_limit:
            raise ValueError(f"Expense report exceeds monthly budget limit: {monthly_limit}")
        
        # Check category limits
        category_limits = department_limits.get('categories', {})
        for item in report.items:
            category_key = item.category.value
            if category_key in category_limits:
                category_spent = await self._calculate_category_spending(
                    report.department, category_key
                )
                category_limit = category_limits[category_key]
                
                if category_spent + item.amount > category_limit:
                    raise ValueError(f"Item exceeds category budget limit: {category_key}")
    
    async def _calculate_monthly_spending(self, department: str) -> Decimal:
        """Calculate current monthly spending for department"""
        start_of_month = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        total_spent = Decimal('0')
        
        for report in self.expense_reports:
            if (report.department == department and 
                report.status in [ExpenseStatus.APPROVED, ExpenseStatus.PAID] and
                report.approved_date and report.approved_date >= start_of_month):
                total_spent += report.total_amount
        
        return total_spent
    
    async def _calculate_category_spending(self, department: str, category: str) -> Decimal:
        """Calculate current category spending for department"""
        start_of_month = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        total_spent = Decimal('0')
        
        for report in self.expense_reports:
            if (report.department == department and 
                report.status in [ExpenseStatus.APPROVED, ExpenseStatus.PAID] and
                report.approved_date and report.approved_date >= start_of_month):
                
                for item in report.items:
                    if item.category.value == category:
                        total_spent += item.amount
        
        return total_spent
    
    async def submit_expense_report(self, report_id: str) -> ExpenseReport:
        """Submit expense report for approval"""
        report = self._find_report(report_id)
        if not report:
            raise ValueError(f"Expense report not found: {report_id}")
        
        if report.status != ExpenseStatus.DRAFT:
            raise ValueError(f"Cannot submit report in status: {report.status}")
        
        report.status = ExpenseStatus.SUBMITTED
        report.submitted_date = datetime.now()
        
        # Trigger approval workflow
        await self._trigger_approval_workflow(report)
        
        # Update in memory
        await self._store_in_memory(report)
        
        logger.info(f"Submitted expense report: {report_id}")
        return report
    
    async def _trigger_approval_workflow(self, report: ExpenseReport):
        """Trigger automated approval workflow"""
        if not self.approval_rules.get('auto_approval_enabled', False):
            report.status = ExpenseStatus.PENDING_APPROVAL
            return
        
        # Check if auto-approval is possible
        auto_approve = await self._check_auto_approval(report)
        
        if auto_approve:
            report.status = ExpenseStatus.APPROVED
            report.approved_date = datetime.now()
            report.approved_by = "system_auto_approval"
            
            # Trigger payment process
            await self._trigger_payment_process(report)
        else:
            report.status = ExpenseStatus.PENDING_APPROVAL
            await self._assign_approver(report)
    
    async def _check_auto_approval(self, report: ExpenseReport) -> bool:
        """Check if report qualifies for auto-approval"""
        thresholds = self.approval_rules.get('thresholds', {})
        category_rules = self.approval_rules.get('category_rules', {})
        
        # Check total amount threshold
        manager_threshold = thresholds.get('manager', Decimal('500'))
        if report.total_amount >= manager_threshold:
            return False
        
        # Check individual items
        for item in report.items:
            category_rule = category_rules.get(item.category.value, {})
            auto_approve_limit = category_rule.get('auto_approve_limit', Decimal('0'))
            
            if item.amount > auto_approve_limit:
                return False
        
        return True
    
    async def _assign_approver(self, report: ExpenseReport):
        """Assign appropriate approver based on rules"""
        required_level = self._determine_approval_level(report)
        
        # Simulate approver assignment
        approvers = {
            ApprovalLevel.MANAGER.value: f"manager_{report.department}",
            ApprovalLevel.FINANCE.value: "finance_manager",
            ApprovalLevel.EXECUTIVE.value: "cfo"
        }
        
        approver = approvers.get(required_level.value, "default_approver")
        
        report.metadata = report.metadata or {}
        report.metadata['assigned_approver'] = approver
        report.metadata['approval_level'] = required_level.value
        
        logger.info(f"Assigned approver {approver} to report {report.report_id}")
    
    def _determine_approval_level(self, report: ExpenseReport) -> ApprovalLevel:
        """Determine required approval level"""
        thresholds = self.approval_rules.get('thresholds', {})
        
        if report.total_amount >= thresholds.get('executive', Decimal('10000')):
            return ApprovalLevel.EXECUTIVE
        elif report.total_amount >= thresholds.get('finance', Decimal('2000')):
            return ApprovalLevel.FINANCE
        elif report.total_amount >= thresholds.get('manager', Decimal('500')):
            return ApprovalLevel.MANAGER
        else:
            return ApprovalLevel.NONE
    
    async def approve_expense_report(self, report_id: str, approver_id: str, 
                                  comments: Optional[str] = None) -> ExpenseReport:
        """Approve expense report"""
        report = self._find_report(report_id)
        if not report:
            raise ValueError(f"Expense report not found: {report_id}")
        
        if report.status != ExpenseStatus.PENDING_APPROVAL:
            raise ValueError(f"Cannot approve report in status: {report.status}")
        
        report.status = ExpenseStatus.APPROVED
        report.approved_date = datetime.now()
        report.approved_by = approver_id
        
        if comments:
            report.metadata = report.metadata or {}
            report.metadata['approval_comments'] = comments
        
        # Trigger payment process
        await self._trigger_payment_process(report)
        
        # Update in memory
        await self._store_in_memory(report)
        
        logger.info(f"Approved expense report: {report_id} by {approver_id}")
        return report
    
    async def reject_expense_report(self, report_id: str, approver_id: str, 
                                 reason: str) -> ExpenseReport:
        """Reject expense report"""
        report = self._find_report(report_id)
        if not report:
            raise ValueError(f"Expense report not found: {report_id}")
        
        if report.status != ExpenseStatus.PENDING_APPROVAL:
            raise ValueError(f"Cannot reject report in status: {report.status}")
        
        report.status = ExpenseStatus.REJECTED
        report.rejection_reason = reason
        report.metadata = report.metadata or {}
        report.metadata['rejected_by'] = approver_id
        report.metadata['rejected_date'] = datetime.now().isoformat()
        
        # Update in memory
        await self._store_in_memory(report)
        
        logger.info(f"Rejected expense report: {report_id} by {approver_id}")
        return report
    
    async def _trigger_payment_process(self, report: ExpenseReport):
        """Trigger automated payment process"""
        try:
            # Integrate with payment systems
            payment_data = {
                'report_id': report.report_id,
                'employee_id': report.employee_id,
                'amount': str(report.total_amount),
                'department': report.department,
                'approved_by': report.approved_by
            }
            
            # Simulate payment processing
            logger.info(f"Initiating payment for expense report: {report.report_id}")
            
            # Update status after payment
            report.status = ExpenseStatus.PAID
            
        except Exception as e:
            logger.error(f"Error processing payment for report {report.report_id}: {e}")
            raise
    
    def _find_report(self, report_id: str) -> Optional[ExpenseReport]:
        """Find expense report by ID"""
        return next((r for r in self.expense_reports if r.report_id == report_id), None)
    
    async def _store_in_memory(self, report: ExpenseReport):
        """Store expense report in memory system"""
        memory_key = f"swarm-auto-centralized-1750350014312/financial/expense_report_{report.report_id}"
        memory_data = {
            'report': report.to_dict(),
            'timestamp': datetime.now().isoformat(),
            'type': 'expense_report'
        }
        
        # Store in memory (implementation would use actual memory system)
        logger.info(f"Stored expense report in memory: {memory_key}")
    
    def generate_expense_analytics(self, department: Optional[str] = None, 
                                 start_date: Optional[datetime] = None,
                                 end_date: Optional[datetime] = None) -> Dict[str, Any]:
        """Generate expense analytics and insights"""
        if not start_date:
            start_date = datetime.now() - timedelta(days=30)
        if not end_date:
            end_date = datetime.now()
        
        filtered_reports = [
            r for r in self.expense_reports
            if (not department or r.department == department) and
               r.approved_date and
               start_date <= r.approved_date <= end_date
        ]
        
        analytics = {
            'period': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat()
            },
            'summary': {
                'total_reports': len(filtered_reports),
                'total_amount': sum(r.total_amount for r in filtered_reports),
                'average_report_amount': Decimal('0'),
                'total_items': sum(len(r.items) for r in filtered_reports)
            },
            'by_department': {},
            'by_category': {},
            'top_vendors': {},
            'trends': []
        }
        
        if filtered_reports:
            analytics['summary']['average_report_amount'] = (
                analytics['summary']['total_amount'] / len(filtered_reports)
            )
        
        # Department breakdown
        dept_totals = {}
        for report in filtered_reports:
            dept = report.department
            if dept not in dept_totals:
                dept_totals[dept] = {'count': 0, 'amount': Decimal('0')}
            dept_totals[dept]['count'] += 1
            dept_totals[dept]['amount'] += report.total_amount
        
        analytics['by_department'] = {
            dept: {'count': data['count'], 'amount': str(data['amount'])}
            for dept, data in dept_totals.items()
        }
        
        # Category breakdown
        category_totals = {}
        vendor_totals = {}
        
        for report in filtered_reports:
            for item in report.items:
                # Category totals
                cat = item.category.value
                if cat not in category_totals:
                    category_totals[cat] = Decimal('0')
                category_totals[cat] += item.amount
                
                # Vendor totals
                if item.vendor:
                    if item.vendor not in vendor_totals:
                        vendor_totals[item.vendor] = Decimal('0')
                    vendor_totals[item.vendor] += item.amount
        
        analytics['by_category'] = {k: str(v) for k, v in category_totals.items()}
        
        # Top vendors
        sorted_vendors = sorted(vendor_totals.items(), key=lambda x: x[1], reverse=True)
        analytics['top_vendors'] = {k: str(v) for k, v in sorted_vendors[:10]}
        
        # Convert decimal fields to strings
        analytics['summary']['total_amount'] = str(analytics['summary']['total_amount'])
        analytics['summary']['average_report_amount'] = str(analytics['summary']['average_report_amount'])
        
        return analytics

class VendorManager:
    """Vendor management and validation"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.approved_vendors = self._load_approved_vendors()
    
    def _load_approved_vendors(self) -> Dict[str, Any]:
        """Load approved vendor list"""
        return {
            'amazon': {'category': 'office_supplies', 'auto_approve': True},
            'uber': {'category': 'travel', 'auto_approve': True},
            'stripe': {'category': 'software', 'auto_approve': True}
        }
    
    async def validate_vendor(self, vendor_name: str) -> Dict[str, Any]:
        """Validate vendor and return information"""
        vendor_info = self.approved_vendors.get(vendor_name.lower(), {})
        
        return {
            'approved': bool(vendor_info),
            'category': vendor_info.get('category'),
            'auto_approve': vendor_info.get('auto_approve', False)
        }

class ReceiptProcessor:
    """Receipt processing and OCR"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
    
    async def process_receipt(self, receipt_url: str) -> Dict[str, Any]:
        """Process receipt image and extract data"""
        # Simulate OCR processing
        # In real implementation, would use services like AWS Textract, Google Vision API
        
        extracted_data = {
            'vendor': 'Sample Vendor',
            'amount': '125.50',
            'date': datetime.now().isoformat(),
            'items': ['Office supplies', 'Printer paper'],
            'tax_amount': '12.55',
            'confidence_score': 0.95
        }
        
        logger.info(f"Processed receipt: {receipt_url}")
        return extracted_data

# Example usage and testing
async def main():
    """Example usage of expense management system"""
    config = {
        'auto_approval': True,
        'vendor': {},
        'receipt': {}
    }
    
    engine = ExpenseManagementEngine(config)
    
    # Example expense report
    expense_data = {
        'employee_id': 'emp_12345',
        'department': 'engineering',
        'title': 'Monthly Office Supplies',
        'items': [
            {
                'description': 'Laptop stand',
                'amount': '75.00',
                'category': 'office_supplies',
                'date': datetime.now().isoformat(),
                'vendor': 'amazon'
            },
            {
                'description': 'Software license',
                'amount': '99.00',
                'category': 'software',
                'date': datetime.now().isoformat(),
                'vendor': 'stripe'
            }
        ]
    }
    
    # Create and submit expense report
    report = await engine.create_expense_report(expense_data)
    submitted_report = await engine.submit_expense_report(report.report_id)
    
    print(f"Created and submitted expense report: {submitted_report.report_id}")
    print(f"Status: {submitted_report.status}")
    
    # Generate analytics
    analytics = engine.generate_expense_analytics()
    print(f"Expense analytics: {json.dumps(analytics, indent=2)}")

if __name__ == "__main__":
    asyncio.run(main())