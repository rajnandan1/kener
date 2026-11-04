import { afterEach, describe, expect, it, vi } from "vitest";

const {
  VerifyCaptchaToken,
  GetSiteDataByKey,
  SubscriberLogin,
  VerifySubscriberOTP,
  VerifySubscriberToken,
  UpdateSubscriberMonitors,
  GetSubscribableMonitors,
} = vi.hoisted(() => ({
  VerifyCaptchaToken: vi.fn(),
  GetSiteDataByKey: vi.fn(),
  SubscriberLogin: vi.fn(),
  VerifySubscriberOTP: vi.fn(),
  VerifySubscriberToken: vi.fn(),
  UpdateSubscriberMonitors: vi.fn(),
  GetSubscribableMonitors: vi.fn(),
}));

vi.mock("$lib/server/controllers/captchaController", () => ({ VerifyCaptchaToken }));
vi.mock("$lib/server/controllers/siteDataController", () => ({ GetSiteDataByKey }));
vi.mock("$lib/server/controllers/userSubscriptionsController", async (importOriginal) => ({
  IsEmailSubscriptionEnabled: (
    await importOriginal<typeof import("$lib/server/controllers/userSubscriptionsController")>()
  ).IsEmailSubscriptionEnabled,
  SubscriberLogin,
  VerifySubscriberOTP,
  VerifySubscriberToken,
  UpdateSubscriberMonitors,
  GetSubscribableMonitors,
}));

import post from "./post";

const enabledConfig = { enable: true, methods: { emails: { monitors: true } } };

describe("POST /dashboard-apis/subscription — login action", () => {
  afterEach(() => {
    VerifyCaptchaToken.mockReset();
    GetSiteDataByKey.mockReset();
    SubscriberLogin.mockReset();
  });

  it("rejects and never calls SubscriberLogin when captcha verification fails", async () => {
    GetSiteDataByKey.mockResolvedValue(enabledConfig);
    VerifyCaptchaToken.mockResolvedValue({ success: false });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(
      post({ body: { action: "login", email: "a@b.com", captchaToken: "bad" } } as any),
    ).rejects.toMatchObject({ status: 400 });
    expect(SubscriberLogin).not.toHaveBeenCalled();
  });

  it("proceeds to SubscriberLogin when captcha verification passes", async () => {
    GetSiteDataByKey.mockResolvedValue(enabledConfig);
    VerifyCaptchaToken.mockResolvedValue({ success: true });
    SubscriberLogin.mockResolvedValue({ success: true });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await post({ body: { action: "login", email: "a@b.com", captchaToken: "good" } } as any);

    expect(response.status).toBe(200);
    expect(VerifyCaptchaToken).toHaveBeenCalledWith("good");
    expect(SubscriberLogin).toHaveBeenCalledWith("a@b.com");
  });

  it("proceeds when no captchaToken is sent and no provider is configured (verify no-ops to success)", async () => {
    GetSiteDataByKey.mockResolvedValue(enabledConfig);
    VerifyCaptchaToken.mockResolvedValue({ success: true });
    SubscriberLogin.mockResolvedValue({ success: true });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await post({ body: { action: "login", email: "a@b.com" } } as any);

    expect(response.status).toBe(200);
    expect(VerifyCaptchaToken).toHaveBeenCalledWith(undefined);
  });

  it("passes an explicit JSON null captchaToken through unchanged (not coerced to undefined)", async () => {
    GetSiteDataByKey.mockResolvedValue(enabledConfig);
    VerifyCaptchaToken.mockResolvedValue({ success: true });
    SubscriberLogin.mockResolvedValue({ success: true });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await post({ body: { action: "login", email: "a@b.com", captchaToken: null } } as any);

    expect(response.status).toBe(200);
    expect(VerifyCaptchaToken).toHaveBeenCalledWith(null);
  });
});

describe("POST /dashboard-apis/subscription — monitor preferences", () => {
  const monitors = [
    { tag: "api", name: "API" },
    { tag: "web", name: "Website" },
  ];

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("refuses every action while monitor subscriptions are off", async () => {
    GetSiteDataByKey.mockResolvedValue({ enable: true, methods: { emails: { monitors: false } } });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(post({ body: { action: "getPreferences", token: "t" } } as any)).rejects.toMatchObject({
      status: 400,
    });
    expect(VerifySubscriberToken).not.toHaveBeenCalled();
  });

  it("keeps subscriptions on for settings saved before monitor subscriptions", async () => {
    GetSiteDataByKey.mockResolvedValue({ enable: true, methods: { emails: { incidents: true, maintenances: false } } });
    VerifySubscriberToken.mockResolvedValue({ success: true, user: { email: "a@b.com" }, monitorTags: [] });
    GetSubscribableMonitors.mockResolvedValue(monitors);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await post({ body: { action: "getPreferences", token: "t" } } as any);

    expect(response.status).toBe(200);
  });

  it("returns the subscriber's monitors and the monitors they can pick", async () => {
    GetSiteDataByKey.mockResolvedValue(enabledConfig);
    VerifySubscriberToken.mockResolvedValue({ success: true, user: { email: "a@b.com" }, monitorTags: ["web"] });
    GetSubscribableMonitors.mockResolvedValue(monitors);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await post({ body: { action: "getPreferences", token: "t" } } as any);

    expect(await response.json()).toEqual({
      success: true,
      email: "a@b.com",
      monitors: ["web"],
      availableMonitors: monitors,
    });
  });

  it("passes the monitor changes on and returns the monitors now followed", async () => {
    GetSiteDataByKey.mockResolvedValue(enabledConfig);
    UpdateSubscriberMonitors.mockResolvedValue({ success: true, monitorTags: ["api"] });

    const response = await post({
      body: { action: "updatePreferences", token: "t", monitors: { api: true, web: false } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    expect(UpdateSubscriberMonitors).toHaveBeenCalledWith("t", { api: true, web: false });
    expect(await response.json()).toEqual({ success: true, monitors: ["api"] });
  });

  it.each([
    ["missing", undefined],
    ["a list", ["api"]],
    ["not true or false", { api: "yes" }],
  ])("rejects monitor changes that are %s", async (_, changes) => {
    GetSiteDataByKey.mockResolvedValue(enabledConfig);

    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      post({ body: { action: "updatePreferences", token: "t", monitors: changes } } as any),
    ).rejects.toMatchObject({ status: 400 });
    expect(UpdateSubscriberMonitors).not.toHaveBeenCalled();
  });
});

describe("POST /dashboard-apis/subscription — verify action", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it.each([null, 123456, undefined])("refuses a %j code before looking up anyone", async (code) => {
    GetSiteDataByKey.mockResolvedValue(enabledConfig);

    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      post({ body: { action: "verify", email: "victim@example.com", code } } as any),
    ).rejects.toMatchObject({ status: 400 });
    expect(VerifySubscriberOTP).not.toHaveBeenCalled();
  });
});
