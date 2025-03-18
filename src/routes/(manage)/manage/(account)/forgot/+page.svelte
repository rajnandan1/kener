<script>
  import { base } from "$app/paths";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import * as Alert from "$lib/components/ui/alert";

  let form = {
    email: ""
  };
  export let data;
  let isResendSet = data.isResendSet && data.isSecretSet;
  if (!isResendSet && !data.isSMTPSet) {
    data.view = "error";
    data.error = `<p>Environment variables are not set. Read the documentation to set them. https://kener.ing/docs/environment-vars</p>
		<br/>
		<p>Either Set RESEND_API_KEY, RESEND_SENDER_EMAIL <br>or<br> Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM_EMAIL</p>
		<br/>
		<p>If both are set then SMTP will take priority</p>`;
  }

  if (data.isSiteURLSet === false) {
    data.view = "error";
    data.error = "Site URL is not set. Read the documentation to set it. https://kener.ing/docs/site";
  }
</script>

<svelte:head>
  <title>Forgot Password Kener</title>
</svelte:head>
<div class="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8">
  <div class="sm:mx-auto sm:w-full sm:max-w-sm">
    <img class="mx-auto h-10 w-auto" src="{base}/logo.png" alt="Your Company" />
    <h2 class="mt-10 text-center text-2xl/9 font-bold tracking-tight">Reset Password</h2>
    <p class="mt-4 text-center">Follow instructions to reset your password</p>
  </div>

  <div class="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
    {#if data.view == "error"}
      <Alert.Root variant="destructive" class="my-4">
        <Alert.Title>Error</Alert.Title>
        <Alert.Description>{@html data.error}</Alert.Description>
      </Alert.Root>
    {/if}
    {#if data.view == "forgot"}
      <form class="space-y-6" action="{base}/manage/forgot/submit" method="POST">
        <div>
          <label for="email" class="block text-sm/6 font-medium">Email address</label>
          <div class="mt-2">
            <Input
              bind:value={form.email}
              type="email"
              name="email"
              id="form_email"
              autocomplete="email"
              placeholder="user@example.com"
              required
            />
          </div>
        </div>

        <div>
          <Button type="submit" class="w-full">Reset Password</Button>
        </div>
      </form>
    {/if}
    {#if data.view == "sent"}
      <Alert.Root variant="success" class="my-4">
        <Alert.Title>Success</Alert.Title>
        <Alert.Description class="flex flex-col gap-y-2">
          <p>An email has been sent to {data.email} with instructions on how to reset your password.</p>
          <p>
            If you don't see the email, check other places it might be, like your junk, spam, social, or other folders.
          </p>
          <p>
            Once you have reset your password, you can <a
              class="font-semibold text-blue-500"
              href="{base}/manage/signin">login</a
            >
          </p>
        </Alert.Description>
      </Alert.Root>
    {/if}

    {#if data.view == "token"}
      <form class="space-y-6" action="{base}/manage/forgot/reset" method="POST">
        <div>
          <label for="password" class="block text-sm/6 font-medium">New password</label>
          <div class="mt-2">
            <Input
              type="password"
              name="password"
              id="form_password"
              autocomplete="new-password"
              placeholder="********"
              required
            />
          </div>
          <Input type="hidden" name="token" id="form_password" bind:value={data.token} required />
        </div>

        <div>
          <Button type="submit" class="w-full">Confirm Password</Button>
        </div>
      </form>
    {/if}
    {#if data.view == "success"}
      <Alert.Root variant="success" class="my-4">
        <Alert.Title>Success</Alert.Title>
        <Alert.Description
          >Your password has been reset successfully. <a class="font-semibold text-blue-500" href="{base}/manage/signin"
            >Login</a
          > with you new password</Alert.Description
        >
      </Alert.Root>
    {/if}
  </div>
</div>
