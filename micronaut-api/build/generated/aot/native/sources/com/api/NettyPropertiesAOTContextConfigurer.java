package com.api;

import io.micronaut.context.ApplicationContextBuilder;
import io.micronaut.context.ApplicationContextConfigurer;
import java.lang.Override;
import java.lang.String;
import java.lang.StringBuilder;
import java.util.Random;

public class NettyPropertiesAOTContextConfigurer implements ApplicationContextConfigurer {
  private static String randomMacAddress() {
    Random rnd = new Random();
    StringBuilder sb = new StringBuilder();
    for (int i = 0; i < 6; i++) {
      sb.append(String.format("%02x", rnd.nextInt(256)));
      if (i < 5) {
        sb.append(":");
      }
    }
    return sb.toString();
  }

  private static String randomPid() {
    return String.valueOf(new Random().nextInt(65536));
  }

  @Override
  public void configure(ApplicationContextBuilder builder) {
    System.setProperty("io.netty.machineId", randomMacAddress());
    System.setProperty("io.netty.processId", randomPid());
  }
}
