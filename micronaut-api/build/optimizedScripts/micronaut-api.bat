@rem
@rem Copyright 2015 the original author or authors.
@rem
@rem Licensed under the Apache License, Version 2.0 (the "License");
@rem you may not use this file except in compliance with the License.
@rem You may obtain a copy of the License at
@rem
@rem      https://www.apache.org/licenses/LICENSE-2.0
@rem
@rem Unless required by applicable law or agreed to in writing, software
@rem distributed under the License is distributed on an "AS IS" BASIS,
@rem WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
@rem See the License for the specific language governing permissions and
@rem limitations under the License.
@rem
@rem SPDX-License-Identifier: Apache-2.0
@rem

@if "%DEBUG%"=="" @echo off
@rem ##########################################################################
@rem
@rem  micronaut-api startup script for Windows
@rem
@rem ##########################################################################

@rem Set local scope for the variables with windows NT shell
if "%OS%"=="Windows_NT" setlocal

set DIRNAME=%~dp0
if "%DIRNAME%"=="" set DIRNAME=.
@rem This is normally unused
set APP_BASE_NAME=%~n0
set APP_HOME=%DIRNAME%..

@rem Resolve any "." and ".." in APP_HOME to make it shorter.
for %%i in ("%APP_HOME%") do set APP_HOME=%%~fi

@rem Add default JVM options here. You can also use JAVA_OPTS and MICRONAUT_API_OPTS to pass JVM options to this script.
set DEFAULT_JVM_OPTS=

@rem Find java.exe
if defined JAVA_HOME goto findJavaFromJavaHome

set JAVA_EXE=java.exe
%JAVA_EXE% -version >NUL 2>&1
if %ERRORLEVEL% equ 0 goto execute

echo. 1>&2
echo ERROR: JAVA_HOME is not set and no 'java' command could be found in your PATH. 1>&2
echo. 1>&2
echo Please set the JAVA_HOME variable in your environment to match the 1>&2
echo location of your Java installation. 1>&2

goto fail

:findJavaFromJavaHome
set JAVA_HOME=%JAVA_HOME:"=%
set JAVA_EXE=%JAVA_HOME%/bin/java.exe

if exist "%JAVA_EXE%" goto execute

echo. 1>&2
echo ERROR: JAVA_HOME is set to an invalid directory: %JAVA_HOME% 1>&2
echo. 1>&2
echo Please set the JAVA_HOME variable in your environment to match the 1>&2
echo location of your Java installation. 1>&2

goto fail

:execute
@rem Setup the command line

set CLASSPATH=%APP_HOME%\lib\micronaut-api-0.1.0-jit.jar;%APP_HOME%\lib\micronaut-data-hibernate-jpa-4.3.1.jar;%APP_HOME%\lib\micronaut-openapi-6.1.0.jar;%APP_HOME%\lib\micronaut-security-jwt-4.4.0.jar;%APP_HOME%\lib\micronaut-security-4.4.0.jar;%APP_HOME%\lib\micronaut-hibernate-jpa-5.2.0.jar;%APP_HOME%\lib\micronaut-jdbc-hikari-5.2.0.jar;%APP_HOME%\lib\micronaut-validation-4.2.0.jar;%APP_HOME%\lib\micronaut-data-jpa-4.3.1.jar;%APP_HOME%\lib\micronaut-data-runtime-4.3.1.jar;%APP_HOME%\lib\micronaut-data-model-4.3.1.jar;%APP_HOME%\lib\micronaut-data-tx-hibernate-4.3.1.jar;%APP_HOME%\lib\micronaut-openapi-annotations-6.1.0.jar;%APP_HOME%\lib\micronaut-openapi-common-6.1.0.jar;%APP_HOME%\lib\micronaut-security-annotations-4.4.0.jar;%APP_HOME%\lib\micronaut-serde-api-2.4.0.jar;%APP_HOME%\lib\micronaut-reactor-3.1.0.jar;%APP_HOME%\lib\micronaut-data-tx-jdbc-4.3.1.jar;%APP_HOME%\lib\micronaut-data-connection-jdbc-4.3.1.jar;%APP_HOME%\lib\micronaut-jdbc-5.2.0.jar;%APP_HOME%\lib\micronaut-data-tx-4.3.1.jar;%APP_HOME%\lib\micronaut-data-connection-hibernate-4.3.1.jar;%APP_HOME%\lib\micronaut-data-connection-4.3.1.jar;%APP_HOME%\lib\micronaut-http-server-netty-4.2.4.jar;%APP_HOME%\lib\micronaut-jackson-databind-4.2.4.jar;%APP_HOME%\lib\micronaut-runtime-4.2.4.jar;%APP_HOME%\lib\h2-2.2.224.jar;%APP_HOME%\lib\hibernate-validator-8.0.1.Final.jar;%APP_HOME%\lib\jakarta.validation-api-3.0.2.jar;%APP_HOME%\lib\swagger-annotations-2.2.19.jar;%APP_HOME%\lib\jbcrypt-0.4.jar;%APP_HOME%\lib\hibernate-core-6.2.13.Final.jar;%APP_HOME%\lib\jakarta.persistence-api-3.1.0.jar;%APP_HOME%\lib\jakarta.transaction-api-2.0.1.jar;%APP_HOME%\lib\micronaut-discovery-core-4.2.4.jar;%APP_HOME%\lib\micronaut-http-server-4.2.4.jar;%APP_HOME%\lib\micronaut-http-netty-4.2.4.jar;%APP_HOME%\lib\micronaut-router-4.2.4.jar;%APP_HOME%\lib\micronaut-jackson-core-4.2.4.jar;%APP_HOME%\lib\micronaut-json-core-4.2.4.jar;%APP_HOME%\lib\micronaut-http-4.2.4.jar;%APP_HOME%\lib\micronaut-context-propagation-4.2.4.jar;%APP_HOME%\lib\micronaut-retry-4.2.4.jar;%APP_HOME%\lib\micronaut-context-4.2.4.jar;%APP_HOME%\lib\micronaut-aop-4.2.4.jar;%APP_HOME%\lib\micronaut-buffer-netty-4.2.4.jar;%APP_HOME%\lib\micronaut-inject-4.2.4.jar;%APP_HOME%\lib\logback-classic-1.4.13.jar;%APP_HOME%\lib\jboss-logging-3.5.0.Final.jar;%APP_HOME%\lib\classmate-1.5.1.jar;%APP_HOME%\lib\jackson-datatype-jdk8-2.15.3.jar;%APP_HOME%\lib\jackson-datatype-jsr310-2.15.3.jar;%APP_HOME%\lib\jackson-dataformat-yaml-2.15.3.jar;%APP_HOME%\lib\jackson-databind-2.15.3.jar;%APP_HOME%\lib\swagger-models-2.2.19.jar;%APP_HOME%\lib\jackson-annotations-2.15.3.jar;%APP_HOME%\lib\jackson-core-2.15.3.jar;%APP_HOME%\lib\jakarta.annotation-api-2.1.1.jar;%APP_HOME%\lib\netty-codec-http2-4.1.106.Final.jar;%APP_HOME%\lib\netty-codec-http-4.1.106.Final.jar;%APP_HOME%\lib\netty-handler-4.1.106.Final.jar;%APP_HOME%\lib\netty-codec-4.1.106.Final.jar;%APP_HOME%\lib\netty-transport-native-unix-common-4.1.106.Final.jar;%APP_HOME%\lib\netty-transport-4.1.106.Final.jar;%APP_HOME%\lib\netty-buffer-4.1.106.Final.jar;%APP_HOME%\lib\reactor-core-3.5.11.jar;%APP_HOME%\lib\micronaut-core-reactive-4.2.4.jar;%APP_HOME%\lib\reactive-streams-1.0.4.jar;%APP_HOME%\lib\snakeyaml-2.1.jar;%APP_HOME%\lib\micronaut-core-4.2.4.jar;%APP_HOME%\lib\logback-core-1.4.13.jar;%APP_HOME%\lib\HikariCP-5.1.0.jar;%APP_HOME%\lib\slf4j-api-2.0.9.jar;%APP_HOME%\lib\flexmark-html2md-converter-0.64.8.jar;%APP_HOME%\lib\javadoc-parser-0.3.1.jar;%APP_HOME%\lib\jsoup-1.16.2.jar;%APP_HOME%\lib\nimbus-jose-jwt-9.37.1.jar;%APP_HOME%\lib\netty-resolver-4.1.106.Final.jar;%APP_HOME%\lib\netty-common-4.1.106.Final.jar;%APP_HOME%\lib\jakarta.inject-api-2.0.1.jar;%APP_HOME%\lib\hibernate-commons-annotations-6.0.6.Final.jar;%APP_HOME%\lib\jandex-3.0.5.jar;%APP_HOME%\lib\byte-buddy-1.14.7.jar;%APP_HOME%\lib\jaxb-runtime-4.0.2.jar;%APP_HOME%\lib\jaxb-core-4.0.2.jar;%APP_HOME%\lib\jakarta.xml.bind-api-4.0.0.jar;%APP_HOME%\lib\antlr4-runtime-4.10.1.jar;%APP_HOME%\lib\flexmark-ext-emoji-0.64.8.jar;%APP_HOME%\lib\flexmark-jira-converter-0.64.8.jar;%APP_HOME%\lib\flexmark-ext-gfm-strikethrough-0.64.8.jar;%APP_HOME%\lib\flexmark-ext-tables-0.64.8.jar;%APP_HOME%\lib\flexmark-ext-wikilink-0.64.8.jar;%APP_HOME%\lib\flexmark-ext-ins-0.64.8.jar;%APP_HOME%\lib\flexmark-ext-superscript-0.64.8.jar;%APP_HOME%\lib\flexmark-util-0.64.8.jar;%APP_HOME%\lib\flexmark-0.64.8.jar;%APP_HOME%\lib\jcip-annotations-1.0-1.jar;%APP_HOME%\lib\angus-activation-2.0.0.jar;%APP_HOME%\lib\jakarta.activation-api-2.1.1.jar;%APP_HOME%\lib\flexmark-util-format-0.64.8.jar;%APP_HOME%\lib\flexmark-util-ast-0.64.8.jar;%APP_HOME%\lib\flexmark-util-builder-0.64.8.jar;%APP_HOME%\lib\flexmark-util-dependency-0.64.8.jar;%APP_HOME%\lib\flexmark-util-html-0.64.8.jar;%APP_HOME%\lib\flexmark-util-options-0.64.8.jar;%APP_HOME%\lib\flexmark-util-sequence-0.64.8.jar;%APP_HOME%\lib\flexmark-util-collection-0.64.8.jar;%APP_HOME%\lib\flexmark-util-data-0.64.8.jar;%APP_HOME%\lib\flexmark-util-misc-0.64.8.jar;%APP_HOME%\lib\flexmark-util-visitor-0.64.8.jar;%APP_HOME%\lib\txw2-4.0.2.jar;%APP_HOME%\lib\istack-commons-runtime-4.1.1.jar


@rem Execute micronaut-api
"%JAVA_EXE%" %DEFAULT_JVM_OPTS% %JAVA_OPTS% %MICRONAUT_API_OPTS%  -classpath "%CLASSPATH%" com.api.Application %*

:end
@rem End local scope for the variables with windows NT shell
if %ERRORLEVEL% equ 0 goto mainEnd

:fail
rem Set variable MICRONAUT_API_EXIT_CONSOLE if you need the _script_ return code instead of
rem the _cmd.exe /c_ return code!
set EXIT_CODE=%ERRORLEVEL%
if %EXIT_CODE% equ 0 set EXIT_CODE=1
if not ""=="%MICRONAUT_API_EXIT_CONSOLE%" exit %EXIT_CODE%
exit /b %EXIT_CODE%

:mainEnd
if "%OS%"=="Windows_NT" endlocal

:omega
