package com.api;

import io.micronaut.context.ApplicationContextBuilder;
import io.micronaut.context.ApplicationContextConfigurer;
import java.lang.Override;

public class DeducedEnvironmentConfigurer implements ApplicationContextConfigurer {
  @Override
  public void configure(ApplicationContextBuilder builder) {
    builder.deduceEnvironment(false);
    builder.packages("picocli");
  }

  @Override
  public int getOrder() {
    return LOWEST_PRECEDENCE;
  }
}
