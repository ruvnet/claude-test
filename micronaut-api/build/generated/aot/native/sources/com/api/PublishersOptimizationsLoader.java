package com.api;

import io.micronaut.core.async.publisher.CompletableFuturePublisher;
import io.micronaut.core.async.publisher.Publishers;
import io.micronaut.core.async.publisher.PublishersOptimizations;
import io.micronaut.core.async.subscriber.Completable;
import io.micronaut.core.optim.StaticOptimizations;
import java.lang.Override;
import java.util.Arrays;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public class PublishersOptimizationsLoader implements StaticOptimizations.Loader<PublishersOptimizations> {
  @Override
  public PublishersOptimizations load() {
    return new PublishersOptimizations(Arrays.asList(Flux.class, CompletableFuturePublisher.class, Publishers.JustPublisher.class, Publishers.JustThrowPublisher.class, Mono.class, Completable.class), Arrays.asList(CompletableFuturePublisher.class, Publishers.JustPublisher.class, Publishers.JustThrowPublisher.class, Mono.class), Arrays.asList(Completable.class));
  }
}
