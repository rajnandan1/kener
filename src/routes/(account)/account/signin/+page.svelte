<script lang="ts">
  import { getAdminI18n } from "$lib/admin-i18n/context";
  const { t: adminT } = getAdminI18n();

  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Field from "$lib/components/ui/field/index.js";
  import * as InputGroup from "$lib/components/ui/input-group/index.js";
  import MailIcon from "@lucide/svelte/icons/mail";
  import LockIcon from "@lucide/svelte/icons/lock";
  import UserIcon from "@lucide/svelte/icons/user";
  import AlertCircleIcon from "@lucide/svelte/icons/alert-circle";
  import EyeClosedIcon from "@lucide/svelte/icons/eye-closed";
  import EyeOpenIcon from "@lucide/svelte/icons/eye";
  import LogInIcon from "@lucide/svelte/icons/log-in";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import type { PageProps } from "./$types";
  import { resolve } from "$app/paths";

  let { data, form }: PageProps = $props();
  const isAdminAccountCreated: boolean = $derived(data.isAdminAccountCreated);
  const isSetupComplete: boolean = $derived(data.isSetupComplete);
  const authActionPath = $derived(!isAdminAccountCreated ? "?/signup" : "?/login");
  const emailValue = $derived(form?.values?.email ?? "");
  const nameValue = $derived(form?.values && "name" in form.values ? form.values.name : "");

  const oidcEnabled: boolean = $derived(data.oidc?.enabled ?? false);
  const oidcProviderName: string = $derived(data.oidc?.providerName ?? "SSO");
  const allowLocalLogin: boolean = $derived(data.oidc?.allowLocalLogin ?? true);
  const oidcError: string | null = $derived(data.oidcError ?? null);

  const showLocalLogin: boolean = $derived(!isAdminAccountCreated || allowLocalLogin || !oidcEnabled);

  let loading = $state(false);
  let showPassword = $state(false);
  let password = $state("");
</script>

<svelte:head>
  <title>{!isAdminAccountCreated ? $adminT("Create Admin Account") : $adminT("Sign In")}</title>
</svelte:head>
<div class="flex min-h-screen items-center justify-center p-4">
  <Card.Root class="kener-card w-full max-w-md">
    <Card.Header>
      <Card.Title>{!isAdminAccountCreated ? $adminT("Create Admin Account") : $adminT("Sign In")}</Card.Title>
      <Card.Description>
        {!isAdminAccountCreated
          ? $adminT("Set up your admin account to get started")
          : $adminT("Enter your credentials to access the dashboard")}
      </Card.Description>
    </Card.Header>
    <Card.Content>
      {#if !isSetupComplete}
        <Alert.Root variant="destructive">
          <AlertCircleIcon />
          <Alert.Title>{$adminT("Set up not completed.")}</Alert.Title>
          <Alert.Description>
            <p>{$adminT("Please make sure to set the below environment variables:")}</p>
            <ul class="list-inside list-disc text-sm">
              <li>{$adminT("KENER_SECRET_KEY")}</li>
              <li>{$adminT("ORIGIN")}</li>
              <li>{$adminT("REDIS_URL")}</li>
            </ul>
            <Button
              variant="link"
              size="sm"
              class="text-destructive w-full justify-start underline"
              href="https://kener.ing/docs/v4/setup/environment-variables"
            >
              {$adminT("Go to docs")}
            </Button>
          </Alert.Description>
        </Alert.Root>
      {:else}
        {#if oidcError}
          <Alert.Root variant="destructive" class="mb-4">
            <AlertCircleIcon />
            <Alert.Title>{$adminT("Authentication failed")}</Alert.Title>
            <Alert.Description>{$adminT(String(oidcError ?? ""))}</Alert.Description>
          </Alert.Root>
        {/if}

        {#if oidcEnabled && isAdminAccountCreated}
          <div class="mb-4">
            <Button variant="outline" class="w-full" href={resolve("/account/oidc/login")}>
              <LogInIcon class="mr-2 h-4 w-4" />
              {$adminT("Sign in with")}
              {oidcProviderName}
            </Button>
          </div>

          {#if showLocalLogin}
            <div class="relative my-6">
              <div class="absolute inset-0 flex items-center">
                <span class="border-border w-full border-t"></span>
              </div>
              <div class="relative flex justify-center text-xs uppercase">
                <span class="bg-card text-muted-foreground px-2">{$adminT("or")}</span>
              </div>
            </div>
          {/if}
        {/if}

        {#if showLocalLogin}
          <form
            method="POST"
            action={authActionPath}
            onsubmit={() => {
              loading = true;
            }}
          >
            {#if form?.error}
              <Alert.Root variant="destructive" class="mb-4">
                <AlertCircleIcon />
                <Alert.Title>{!isAdminAccountCreated ? $adminT("Signup failed") : $adminT("Login failed")}</Alert.Title>
                <Alert.Description>{$adminT(String(form.error ?? ""))}</Alert.Description>
              </Alert.Root>
            {/if}

            <Field.Group>
              {#if !isAdminAccountCreated}
                <Field.Field>
                  <Field.Label for="name">{$adminT("Name")}</Field.Label>
                  <InputGroup.Root>
                    <InputGroup.Addon>
                      <UserIcon />
                    </InputGroup.Addon>
                    <InputGroup.Input
                      id="name"
                      name="name"
                      type="text"
                      placeholder={$adminT("Your name")}
                      value={nameValue}
                      required
                    />
                  </InputGroup.Root>
                </Field.Field>
              {/if}

              <Field.Field class="relative flex flex-col gap-1">
                <Field.Label for="email">{$adminT("Email")}</Field.Label>
                <InputGroup.Root>
                  <InputGroup.Addon>
                    <MailIcon />
                  </InputGroup.Addon>
                  <InputGroup.Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder={$adminT("you@example.com")}
                    value={emailValue}
                    required
                  />
                </InputGroup.Root>
              </Field.Field>

              <Field.Field class="relative flex flex-col gap-1">
                <Field.Label for="password" class="relative">
                  {$adminT("Password")}
                  <Button
                    variant="link"
                    size="sm"
                    class="text-muted-foreground absolute top-0 right-0 h-auto p-0 text-xs"
                    href={resolve("/account/forgot")}
                  >
                    {$adminT("Forgot?")}
                  </Button>
                </Field.Label>
                <InputGroup.Root>
                  <InputGroup.Addon>
                    <LockIcon />
                  </InputGroup.Addon>
                  <InputGroup.Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    bind:value={password}
                    required
                  />
                  <InputGroup.Addon align="inline-end">
                    <InputGroup.Button
                      type="button"
                      aria-label={$adminT(String(showPassword ? "Hide password" : "Show password"))}
                      title={$adminT(String(showPassword ? "Hide password" : "Show password"))}
                      size="icon-xs"
                      onclick={() => (showPassword = !showPassword)}
                    >
                      {#if showPassword}
                        <EyeClosedIcon class="size-4" />
                      {:else}
                        <EyeOpenIcon class="size-4" />
                      {/if}
                    </InputGroup.Button>
                  </InputGroup.Addon>
                </InputGroup.Root>
                {#if !isAdminAccountCreated}
                  <Field.Description>
                    {$adminT(
                      "Password must contain at least 8 characters, one uppercase, one lowercase, and one number."
                    )}
                  </Field.Description>
                {/if}
              </Field.Field>
            </Field.Group>

            <div class="mt-6">
              <Button type="submit" class="w-full" disabled={loading}>
                {#if loading}
                  {!isAdminAccountCreated ? $adminT("Creating Account...") : $adminT("Signing In...")}
                {:else}
                  {!isAdminAccountCreated ? $adminT("Create Account") : $adminT("Sign In")}
                {/if}
              </Button>
            </div>
          </form>
        {/if}
      {/if}
    </Card.Content>
  </Card.Root>
</div>
