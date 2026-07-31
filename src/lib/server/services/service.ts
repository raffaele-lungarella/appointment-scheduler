type ServiceConstructor<T extends Service = Service> = new () => T;

export abstract class Service {
  private static readonly instances = new Map<ServiceConstructor, Service>();

  public static get<T extends Service>(this: ServiceConstructor<T>): T {
    let instance = Service.instances.get(this) as T | undefined;

    if (!instance) {
      instance = new this();
      Service.instances.set(this, instance);
    }

    return instance;
  }

  /** Removes this service's cached instance. Intended only for test isolation. */
  public static resetForTests<T extends Service>(this: ServiceConstructor<T>): void {
    Service.instances.delete(this);
  }
}
