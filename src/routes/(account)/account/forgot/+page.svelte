<script lang="ts">
  import { getAdminI18n } from "$lib/admin-i18n/context";
  const { t: adminT } = getAdminI18n();

  import { toast } from "svelte-sonner";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Field from "$lib/components/ui/field/index.js";
  import * as InputGroup from "$lib/components/ui/input-group/index.js";
  import { goto } from "$app/navigation";
  import MailIcon from "@lucide/svelte/icons/mail";
  import LockIcon from "@lucide/svelte/icons/lock";
  import CheckCircleIcon from "@lucide/svelte/icons/check-circle";
  import EyeClosedIcon from "@lucide/svelte/icons/eye-closed";
  import EyeOpenIcon from "@lucide/svelte/icons/eye";
  import ArrowLeftIcon from "@lucide/svelte/icons/arrow-left";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";
  const { data } = $props();

  const view: string = $derived(data.view);
  const token: string = $derived(data.token);

  let loading = $state(false);
  let showPassword = $state(false);
  let showConfirmPassword = $state(false);
  let emailSent = $state(false);
  let passwordReset = $state(false);

  let email = $state("");
  let newPassword = $state("");
  let confirmPassword = $state("");

  async function handleRequestReset() {
    if (!email) {
      toast.error($adminT("Please enter your email address"));
      return;
    }

    loading = true;
    try {
      const response = await fetch(clientResolver(resolve, "/account/forgot/api/fogot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error($adminT(data.error || "Failed to send reset email"));
        return;
      }

      emailSent = true;
      toast.success($adminT("Password reset email sent!"));
    } catch (e) {
      toast.error($adminT("An error occurred. Please try again."));
    } finally {
      loading = false;
    }
  }

  async function handlePasswordReset() {
    if (!newPassword || !confirmPassword) {
      toast.error($adminT("Please fill in all fields"));
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error($adminT("Passwords do not match"));
      return;
    }

    if (newPassword.length < 8) {
      toast.error($adminT("Password must be at least 8 characters"));
      return;
    }

    loading = true;
    try {
      const response = await fetch(clientResolver(resolve, "/account/forgot/api/password-reset"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receivedToken: token, newPassword })
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error($adminT(data.error || "Failed to reset password"));
        return;
      }

      passwordReset = true;
      toast.success($adminT("Password reset successfully!"));
    } catch (e) {
      toast.error($adminT("An error occurred. Please try again."));
    } finally {
      loading = false;
    }
  }

  function handleSubmit(e: Event) {
    e.preventDefault();
    if (view === "confirm_token") {
      handlePasswordReset();
    } else {
      handleRequestReset();
    }
  }
</script>

<svelte:head>
  <title>{view === "confirm_token" ? $adminT("Reset Password") : $adminT("Forgot Password")}</title>
</svelte:head>
<div class="flex min-h-screen items-center justify-center p-4">
  <Card.Root class="kener-card w-full max-w-md">
    {#if view === "confirm_token"}
      <!-- Reset Password View -->
      {#if passwordReset}
        <Card.Header class="text-center">
          <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircleIcon class="h-8 w-8 text-green-600" />
          </div>
          <Card.Title>{$adminT("Password Reset Complete")}</Card.Title>
          <Card.Description>
            {$adminT("Your password has been reset successfully. You can now sign in with your new password.")}
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <Button href={clientResolver(resolve, "/account/signin")} class="w-full">
            <ArrowLeftIcon class="mr-2 h-4 w-4" />
            {$adminT("Back to Sign In")}
          </Button>
        </Card.Content>
      {:else}
        <Card.Header>
          <Card.Title>{$adminT("Set New Password")}</Card.Title>
          <Card.Description>{$adminT("Enter your new password below to complete the reset process.")}</Card.Description>
        </Card.Header>
        <Card.Content>
          <form onsubmit={handleSubmit}>
            <Field.Group>
              <Field.Field class="relative flex flex-col gap-1">
                <Field.Label for="newPassword">{$adminT("New Password")}</Field.Label>
                <InputGroup.Root>
                  <InputGroup.Addon>
                    <LockIcon />
                  </InputGroup.Addon>
                  <InputGroup.Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    bind:value={newPassword}
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
                <Field.Description>{$adminT("Password must be at least 8 characters.")}</Field.Description>
              </Field.Field>

              <Field.Field class="relative flex flex-col gap-1">
                <Field.Label for="confirmPassword">{$adminT("Confirm Password")}</Field.Label>
                <InputGroup.Root>
                  <InputGroup.Addon>
                    <LockIcon />
                  </InputGroup.Addon>
                  <InputGroup.Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    bind:value={confirmPassword}
                    required
                  />
                  <InputGroup.Addon align="inline-end">
                    <InputGroup.Button
                      type="button"
                      aria-label={$adminT(String(showConfirmPassword ? "Hide password" : "Show password"))}
                      title={$adminT(String(showConfirmPassword ? "Hide password" : "Show password"))}
                      size="icon-xs"
                      onclick={() => (showConfirmPassword = !showConfirmPassword)}
                    >
                      {#if showConfirmPassword}
                        <EyeClosedIcon class="size-4" />
                      {:else}
                        <EyeOpenIcon class="size-4" />
                      {/if}
                    </InputGroup.Button>
                  </InputGroup.Addon>
                </InputGroup.Root>
              </Field.Field>
            </Field.Group>

            <div class="mt-6">
              <Button type="submit" class="w-full" disabled={loading}>
                {#if loading}
                  {$adminT("Resetting Password...")}
                {:else}
                  {$adminT("Reset Password")}
                {/if}
              </Button>
            </div>

            <div class="mt-4 text-center">
              <Button variant="link" href={clientResolver(resolve, "/account/signin")} class="text-sm">
                <ArrowLeftIcon class="mr-1 h-3 w-3" />
                {$adminT("Back to Sign In")}
              </Button>
            </div>
          </form>
        </Card.Content>
      {/if}
    {:else}
      <!-- Request Reset View -->
      {#if emailSent}
        <Card.Header class="text-center">
          <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <MailIcon class="h-8 w-8 text-blue-600" />
          </div>
          <Card.Title>{$adminT("Check Your Email")}</Card.Title>
          <Card.Description>
            {$adminT("We've sent a password reset link to")} <strong>{email}</strong>{$adminT(
              ". Please check your inbox and click the link to reset your password."
            )}
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <p class="text-muted-foreground mb-4 text-center text-sm">
            {$adminT("Didn't receive the email? Check your spam folder or try again.")}
          </p>
          <Button variant="outline" class="w-full" onclick={() => (emailSent = false)}>{$adminT("Try Again")}</Button>
          <div class="mt-4 text-center">
            <Button variant="link" href={clientResolver(resolve, "/account/signin")} class="text-sm">
              <ArrowLeftIcon class="mr-1 h-3 w-3" />
              {$adminT("Back to Sign In")}
            </Button>
          </div>
        </Card.Content>
      {:else}
        <Card.Header>
          <Card.Title>{$adminT("Forgot Password")}</Card.Title>
          <Card.Description>
            {$adminT("Enter your email address and we'll send you a link to reset your password.")}
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <form onsubmit={handleSubmit}>
            <Field.Group>
              <Field.Field class="relative flex flex-col gap-1">
                <Field.Label for="email">{$adminT("Email")}</Field.Label>
                <InputGroup.Root>
                  <InputGroup.Addon>
                    <MailIcon />
                  </InputGroup.Addon>
                  <InputGroup.Input
                    id="email"
                    type="email"
                    placeholder={$adminT("you@example.com")}
                    bind:value={email}
                    required
                  />
                </InputGroup.Root>
              </Field.Field>
            </Field.Group>

            <div class="mt-6">
              <Button type="submit" class="w-full" disabled={loading}>
                {#if loading}
                  {$adminT("Sending Reset Link...")}
                {:else}
                  {$adminT("Send Reset Link")}
                {/if}
              </Button>
            </div>

            <div class="mt-4 text-center">
              <Button variant="link" href={clientResolver(resolve, "/account/signin")} class="text-sm">
                <ArrowLeftIcon class="mr-1 h-3 w-3" />
                {$adminT("Back to Sign In")}
              </Button>
            </div>
          </form>
        </Card.Content>
      {/if}
    {/if}
  </Card.Root>
</div>
