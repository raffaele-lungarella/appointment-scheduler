import { afterEach, describe, expect, it } from "vitest";

import { Service } from "./service";

class TestService extends Service {}

function createSameNamedService() {
  return class SameNameService extends Service {};
}

describe("Service", () => {
  afterEach(() => {
    TestService.resetForTests();
  });

  it("returns one instance per constructor", () => {
    expect(TestService.get()).toBe(TestService.get());
  });

  it("does not collide when different constructors have the same name", () => {
    const FirstService = createSameNamedService();
    const SecondService = createSameNamedService();

    expect(FirstService.name).toBe(SecondService.name);
    expect(FirstService.get()).not.toBe(SecondService.get());

    FirstService.resetForTests();
    SecondService.resetForTests();
  });

  it("can reset one service without resetting another", () => {
    const OtherService = createSameNamedService();
    const first = TestService.get();
    const other = OtherService.get();

    TestService.resetForTests();

    expect(TestService.get()).not.toBe(first);
    expect(OtherService.get()).toBe(other);

    OtherService.resetForTests();
  });
});
