<script lang="ts">
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
  import * as Alert from "$lib/components/ui/alert/index.js";
  import type { PageProps } from "./$types";

  let { data, form }: PageProps = $props();
  const isAdminAccountCreated: boolean = $derived(data.isAdminAccountCreated);
  const isSetupComplete: boolean = $derived(data.isSetupComplete);
  const authActionPath = $derived(!isAdminAccountCreated ? "?/signup" : "?/login");
  const emailValue = $derived(form?.values?.email ?? "");
  const nameValue = $derived(form?.values && "name" in form.values ? form.values.name : "");

  let loading = $state(false);
  let showPassword = $state(false);
  let password = $state("");
</script>

<svelte:head>
  <title>{!isAdminAccountCreated ? "Create Admin Account" : "Sign In"}</title>
</svelte:head>
<div class="flex min-h-screen items-center justify-center p-4">
  <Card.Root class="kener-card w-full max-w-md">
    <Card.Header>
      <Card.Title>{!isAdminAccountCreated ? "Create Admin Account" : "Sign In"}</Card.Title>
      <Card.Description>
        {!isAdminAccountCreated
          ? "Set up your admin account to get started"
          : "Enter your credentials to access the dashboard"}
      </Card.Description>
    </Card.Header>
    <Card.Content>
      {#if !isSetupComplete}
        <Alert.Root variant="destructive">
          <AlertCircleIcon />
          <Alert.Title>Set up not completed.</Alert.Title>
          <Alert.Description>
            <p>Please make sure to set the below environment variables:</p>
            <ul class="list-inside list-disc text-sm">
              <li>KENER_SECRET_KEY</li>
            </ul>
          </Alert.Description>
        </Alert.Root>
      {:else}
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
              <Alert.Title>{!isAdminAccountCreated ? "Signup failed" : "Login failed"}</Alert.Title>
              <Alert.Description>{form.error}</Alert.Description>
            </Alert.Root>
          {/if}

          <Field.Group>
            {#if !isAdminAccountCreated}
              <Field.Field>
                <Field.Label for="name">Name</Field.Label>
                <InputGroup.Root>
                  <InputGroup.Addon>
                    <UserIcon />
                  </InputGroup.Addon>
                  <InputGroup.Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Your name"
                    value={nameValue}
                    required
                  />
                </InputGroup.Root>
              </Field.Field>
            {/if}

            <Field.Field class="relative flex flex-col gap-1">
              <Field.Label for="email">Email</Field.Label>
              <InputGroup.Root>
                <InputGroup.Addon>
                  <MailIcon />
                </InputGroup.Addon>
                <InputGroup.Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={emailValue}
                  required
                />
              </InputGroup.Root>
            </Field.Field>

            <Field.Field class="relative flex flex-col gap-1">
              <Field.Label for="password" class="relative">
                Password
                <Button
                  variant="link"
                  size="sm"
                  class="text-muted-foreground absolute top-0 right-0 h-auto p-0 text-xs"
                  href="/account/forgot"
                >
                  Forgot?
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
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    title={showPassword ? "Hide password" : "Show password"}
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
                  Password must contain at least 8 characters, one uppercase, one lowercase, and one number.
                </Field.Description>
              {/if}
            </Field.Field>
          </Field.Group>

          <div class="mt-6">
            <Button type="submit" class="w-full" disabled={loading}>
              {#if loading}
                {!isAdminAccountCreated ? "Creating Account..." : "Signing In..."}
              {:else}
                {!isAdminAccountCreated ? "Create Account" : "Sign In"}
              {/if}
            </Button>
          </div>
        </form>
      {/if}
    </Card.Content>
  </Card.Root>
</div>
