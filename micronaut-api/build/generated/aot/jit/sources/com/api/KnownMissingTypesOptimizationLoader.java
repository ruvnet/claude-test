package com.api;

import io.micronaut.core.optim.StaticOptimizations;
import io.micronaut.core.reflect.ClassUtils;
import java.lang.Override;
import java.lang.String;
import java.util.HashSet;
import java.util.Set;

public class KnownMissingTypesOptimizationLoader implements StaticOptimizations.Loader<ClassUtils.Optimizations> {
  @Override
  public ClassUtils.Optimizations load() {
    Set<String> knownMissingTypes = new HashSet<String>();
    knownMissingTypes.add("io.reactivex.Observable");
    knownMissingTypes.add("kotlinx.coroutines.flow.Flow");
    knownMissingTypes.add("io.reactivex.rxjava3.core.Flowable");
    knownMissingTypes.add("io.reactivex.rxjava3.core.Observable");
    knownMissingTypes.add("io.reactivex.Single");
    knownMissingTypes.add("io.reactivex.Maybe");
    knownMissingTypes.add("io.reactivex.rxjava3.core.Single");
    knownMissingTypes.add("io.reactivex.rxjava3.core.Maybe");
    knownMissingTypes.add("io.reactivex.Completable");
    knownMissingTypes.add("io.reactivex.rxjava3.core.Completable");
    knownMissingTypes.add("io.methvin.watchservice.MacOSXListeningWatchService");
    knownMissingTypes.add("io.micronaut.core.async.publisher.Publishers.JustPublisher");
    return new ClassUtils.Optimizations(knownMissingTypes);
  }
}
