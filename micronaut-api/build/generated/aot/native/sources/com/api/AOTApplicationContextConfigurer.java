package com.api;

import io.micronaut.context.ApplicationContextBuilder;
import io.micronaut.context.ApplicationContextConfigurer;
import io.micronaut.core.optim.StaticOptimizations;
import java.lang.Override;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

public class AOTApplicationContextConfigurer implements ApplicationContextConfigurer {
  static {
    enableEnvironmentCaching();
  }

  private static void enableEnvironmentCaching() {
    StaticOptimizations.cacheEnvironment();
  }

  private static List list0() {
    List result = new ArrayList<>(7);
    result.add("cached.environment");
    result.add("deduce.environment");
    result.add("graalvm.config");
    result.add("known.missing.types");
    result.add("netty.properties");
    result.add("precompute.environment.properties");
    result.add("scan.reactive.types");
    return result;
  }

  @Override
  public void configure(ApplicationContextBuilder builder) {
    builder.properties(new HashMap() {{
        put("micronaut.aot.enabled", true);
        put("micronaut.aot.runtime", "NATIVE");
        put("micronaut.aot.optimizations", list0());
        }});
  }
}
