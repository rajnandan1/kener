<script>
  import { page } from "$app/stores";
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import Loader from "lucide-svelte/icons/loader";
  import Info from "lucide-svelte/icons/info";
  import X from "lucide-svelte/icons/x";
  import Check from "lucide-svelte/icons/check";
  import { base } from "$app/paths";
  import * as Alert from "$lib/components/ui/alert";

  let savingName = false;
  let invalidFormMessage = "";
  let sendingEmail = false;
  let invalidEmailMessage = "";
  let resettingPass = false;
  let invalidResettingPass = "";
  let myName = $page.data.user.name;
  let myPassword = "";
  let plainPassword = "";

  // Password validation conditions
  $: hasDigit = /\d/.test(myPassword);
  $: hasLowercase = /[a-z]/.test(myPassword);
  $: hasUppercase = /[A-Z]/.test(myPassword);
  $: hasLetter = /[a-zA-Z]/.test(myPassword);
  $: hasMinLength = myPassword.length >= 8;
  $: passwordsMatch = myPassword === plainPassword && myPassword !== "";

  async function saveName() {
    savingName = true;
    invalidFormMessage = "";
    try {
      let data = await fetch(base + "/manage/app/api/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: "updateUser",
          data: {
            updateValue: myName,
            updateKey: "name"
          }
        })
      });
      let resp = await data.json();
      if (resp.error) {
        invalidFormMessage = resp.error;
      }
    } catch (error) {
      invalidFormMessage = "Error while saving data";
    } finally {
      savingName = false;
    }
  }

  //send verification email
  async function sendVerificationEmail() {
    try {
      sendingEmail = true;
      invalidEmailMessage = "";
      let data = await fetch(base + "/manage/app/api/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: "sendVerificationEmail"
        })
      });
      let resp = await data.json();
      if (resp.error) {
        invalidEmailMessage = resp.error;
      }
    } catch (error) {
      invalidEmailMessage = "Error while sending verification email";
    } finally {
      sendingEmail = false;
    }
  }

  async function updatePassword() {
    resettingPass = true;
    try {
      let data = await fetch(base + "/manage/app/api/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: "updatePassword",
          data: {
            newPassword: myPassword,
            newPlainPassword: plainPassword
          }
        })
      });
      let resp = await data.json();
      if (resp.error) {
        invalidResettingPass = resp.error;
      } else {
        invalidResettingPass = "";
        myPassword = "";
        plainPassword = "";
      }
    } catch (error) {
      invalidResettingPass = "Error while updating password";
    } finally {
      resettingPass = false;
    }
  }
</script>

<div class="min-h-[70vh]">
  <Card.Root class="mt-4">
    <Card.Header class="border-b">
      <Card.Title class="flex justify-between">
        <div>Your Profile</div>

        <div class="text-sm font-medium uppercase text-muted-foreground">
          {#if $page.data.user.role === "editor"}
            <span
              class="me-2 rounded-sm bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-300"
            >
              {$page.data.user.role}
            </span>
          {:else if $page.data.user.role === "member"}
            <span
              class="me-2 rounded-sm bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
            >
              {$page.data.user.role}
            </span>
          {:else if $page.data.user.role === "admin"}
            <span
              class="me-2 rounded-sm bg-pink-100 px-2.5 py-0.5 text-xs font-medium text-pink-800 dark:bg-pink-900 dark:text-pink-300"
            >
              {$page.data.user.role}
            </span>
          {/if}
        </div>
      </Card.Title>
      <Card.Description>Configure your profile information here.</Card.Description>
    </Card.Header>
    <Card.Content class="flex flex-col gap-y-8 pt-4">
      <div class="flex-col gap-y-2">
        Hi, your email address is <i>{$page.data.user.email}</i>. To change your email address, please contact support.
      </div>
      {#if $page.data.canSendEmail && $page.data.user.is_verified === 0}
        <Alert.Root class="relative my-4 border-yellow-500 bg-transparent pr-12 ">
          <Info class="h-4 w-4 " />
          <Alert.Title>Email Not Verified</Alert.Title>
          {#if $page.data.activeInvitationExists === false}
            <Alert.Description>Your email is not verified. Please verify your email.</Alert.Description>
          {:else}
            <Alert.Description>Please check your inbox for an email to verify your email</Alert.Description>
          {/if}
          <Button
            disabled={sendingEmail}
            class="absolute right-3 top-4"
            variant="secondary"
            on:click={sendVerificationEmail}
          >
            {#if $page.data.activeInvitationExists === false}
              Send Verification Email
            {:else}
              Resend Verification Email
            {/if}
            {#if sendingEmail}
              <Loader class="ml-2 h-4 w-4 animate-spin" />
            {/if}
          </Button>
        </Alert.Root>
      {/if}

      <div class="flex-col gap-y-2">
        <form class="flex flex-row gap-x-2" on:submit|preventDefault={saveName}>
          <div class="flex w-64 flex-col gap-y-2">
            <Label for="name">Name</Label>
            <Input disabled={savingName} id="name" placeholder="Your name" bind:value={myName} />
          </div>
          <div class="">
            <Button class="mt-6 " variant="primary" type="submit" disabled={savingName}>
              Update Name

              {#if savingName}
                <Loader class="ml-2 h-4 w-4 animate-spin" />
              {/if}
            </Button>
          </div>
        </form>
        <p>
          {#if invalidFormMessage}
            <div class="flex flex-row items-center gap-x-2 rounded-md py-2 text-sm font-medium text-destructive">
              <span>{invalidFormMessage}</span>
            </div>
          {/if}
        </p>
      </div>
      <hr />
      <div class="flex flex-col gap-y-2">
        <form class="flex flex-row gap-x-2" on:submit|preventDefault={updatePassword}>
          <div class="flex w-64 flex-col gap-y-2">
            <Label for="myPassword">New Password</Label>
            <Input
              disabled={resettingPass}
              type="password"
              id="myPassword"
              placeholder="New Password"
              bind:value={myPassword}
            />
          </div>
          <div class="flex w-64 flex-col gap-y-2">
            <Label for="plainPassword">Confirm Password</Label>
            <Input
              disabled={resettingPass}
              type="text"
              id="plainPassword"
              placeholder="Re-Enter New Password"
              bind:value={plainPassword}
            />
          </div>
          <div class="">
            <Button class="mt-6" variant="primary" type="submit" disabled={resettingPass}>
              Update Password

              {#if resettingPass}
                <Loader class="ml-2 h-4 w-4 animate-spin" />
              {/if}
            </Button>
          </div>
        </form>
        <div>
          <p class="mb-1 text-sm">Your password should:</p>
          <ul class="flex flex-col gap-y-1">
            <li class="text-xs font-medium text-muted-foreground">
              <i class:hidden={!hasDigit} class:text-green-500={hasDigit}><Check class="inline h-3 w-3" /></i>
              Contains at least one digit
            </li>
            <li class="text-xs font-medium text-muted-foreground">
              <i class:hidden={!hasLowercase} class:text-green-500={hasLowercase}><Check class="inline h-3 w-3" /></i>
              Contains at least one lowercase letter
            </li>
            <li class="text-xs font-medium text-muted-foreground">
              <i class:hidden={!hasUppercase} class:text-green-500={hasUppercase}><Check class="inline h-3 w-3" /></i>
              Contains at least one uppercase letter
            </li>
            <li class="text-xs font-medium text-muted-foreground">
              <i class:hidden={!hasLetter} class:text-green-500={hasLetter}><Check class="inline h-3 w-3" /></i>
              Contains at least one letter
            </li>
            <li class="text-xs font-medium text-muted-foreground">
              <i class:hidden={!hasMinLength} class:text-green-500={hasMinLength}><Check class="inline h-3 w-3" /></i>
              Has a minimum length of 8 characters
            </li>
            <li class="text-xs font-medium text-muted-foreground">
              <i class:hidden={!passwordsMatch} class:text-green-500={passwordsMatch}
                ><Check class="inline h-3 w-3" /></i
              >
              Passwords match
            </li>
          </ul>
        </div>
        <p>
          {#if invalidResettingPass}
            <div class="flex flex-row items-center gap-x-2 rounded-md py-2 text-sm font-medium text-red-500">
              <Info class="h-4 w-4" />
              <span>{invalidResettingPass}</span>
            </div>
          {/if}
        </p>
      </div>
    </Card.Content>
  </Card.Root>
</div>
