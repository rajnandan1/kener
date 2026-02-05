<script lang="ts">
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
      toast.error("Please enter your email address");
      return;
    }

    loading = true;
    try {
      const response = await fetch("/account/forgot/api/fogot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to send reset email");
        return;
      }

      emailSent = true;
      toast.success("Password reset email sent!");
    } catch (e) {
      toast.error("An error occurred. Please try again.");
    } finally {
      loading = false;
    }
  }

  async function handlePasswordReset() {
    if (!newPassword || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    loading = true;
    try {
      const response = await fetch("/account/forgot/api/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receivedToken: token, newPassword })
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to reset password");
        return;
      }

      passwordReset = true;
      toast.success("Password reset successfully!");
    } catch (e) {
      toast.error("An error occurred. Please try again.");
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
  <title>{view === "confirm_token" ? "Reset Password" : "Forgot Password"}</title>
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
          <Card.Title>Password Reset Complete</Card.Title>
          <Card.Description>
            Your password has been reset successfully. You can now sign in with your new password.
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <Button href="/account/signin" class="w-full">
            <ArrowLeftIcon class="mr-2 h-4 w-4" />
            Back to Sign In
          </Button>
        </Card.Content>
      {:else}
        <Card.Header>
          <Card.Title>Set New Password</Card.Title>
          <Card.Description>Enter your new password below to complete the reset process.</Card.Description>
        </Card.Header>
        <Card.Content>
          <form onsubmit={handleSubmit}>
            <Field.Group>
              <Field.Field class="relative flex flex-col gap-1">
                <Field.Label for="newPassword">New Password</Field.Label>
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
                <Field.Description>Password must be at least 8 characters.</Field.Description>
              </Field.Field>

              <Field.Field class="relative flex flex-col gap-1">
                <Field.Label for="confirmPassword">Confirm Password</Field.Label>
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
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      title={showConfirmPassword ? "Hide password" : "Show password"}
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
                  Resetting Password...
                {:else}
                  Reset Password
                {/if}
              </Button>
            </div>

            <div class="mt-4 text-center">
              <Button variant="link" href="/account/signin" class="text-sm">
                <ArrowLeftIcon class="mr-1 h-3 w-3" />
                Back to Sign In
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
          <Card.Title>Check Your Email</Card.Title>
          <Card.Description>
            We've sent a password reset link to <strong>{email}</strong>. Please check your inbox and click the link to
            reset your password.
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <p class="text-muted-foreground mb-4 text-center text-sm">
            Didn't receive the email? Check your spam folder or try again.
          </p>
          <Button variant="outline" class="w-full" onclick={() => (emailSent = false)}>Try Again</Button>
          <div class="mt-4 text-center">
            <Button variant="link" href="/account/signin" class="text-sm">
              <ArrowLeftIcon class="mr-1 h-3 w-3" />
              Back to Sign In
            </Button>
          </div>
        </Card.Content>
      {:else}
        <Card.Header>
          <Card.Title>Forgot Password</Card.Title>
          <Card.Description>
            Enter your email address and we'll send you a link to reset your password.
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <form onsubmit={handleSubmit}>
            <Field.Group>
              <Field.Field class="relative flex flex-col gap-1">
                <Field.Label for="email">Email</Field.Label>
                <InputGroup.Root>
                  <InputGroup.Addon>
                    <MailIcon />
                  </InputGroup.Addon>
                  <InputGroup.Input id="email" type="email" placeholder="you@example.com" bind:value={email} required />
                </InputGroup.Root>
              </Field.Field>
            </Field.Group>

            <div class="mt-6">
              <Button type="submit" class="w-full" disabled={loading}>
                {#if loading}
                  Sending Reset Link...
                {:else}
                  Send Reset Link
                {/if}
              </Button>
            </div>

            <div class="mt-4 text-center">
              <Button variant="link" href="/account/signin" class="text-sm">
                <ArrowLeftIcon class="mr-1 h-3 w-3" />
                Back to Sign In
              </Button>
            </div>
          </form>
        </Card.Content>
      {/if}
    {/if}
  </Card.Root>
</div>
