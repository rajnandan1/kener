// @ts-nocheck
// @ts-ignore
import { json } from "@sveltejs/kit";
import emailCodeTemplate from "$lib/server/templates/email_code.html?raw";
import { GetNowTimestampUTC, GenerateRandomNumber, ValidateEmail } from "$lib/server/tool.js";
import {
  GetSiteLogoURL,
  SendEmailWithTemplate,
  GetAllSiteData,
  CreateNewSubscriber,
  GetSubscriberByEmailAndType,
  CreateNewSubscription,
  UpdateSubscriberMeta,
  RemoveAllSubscriptions,
  GetSubscriptionsBySubscriberID,
  UpdateSubscriberStatus,
  DeleteSubscriberByID,
} from "$lib/server/controllers/controller.js";
import { base } from "$app/paths";

async function enrollSubscriber(email, existingSubscriber, data) {
  let emailCode = GenerateRandomNumber(6);
  let siteData = await GetAllSiteData();

  let newSubscriberData = {
    subscriber_send: email,
    subscriber_type: "email",
    subscriber_status: "PENDING",
    subscriber_meta: JSON.stringify({
      email_code: emailCode,
      generated_at: GetNowTimestampUTC() + 86400,
    }),
  };

  try {
    if (!!!existingSubscriber) {
      await CreateNewSubscriber(newSubscriberData);
    } else {
      let subscriberMeta = JSON.parse(existingSubscriber.subscriber_meta);
      let generateAt = parseInt(subscriberMeta.generated_at);
      //return if the code is not expired
      if (generateAt > GetNowTimestampUTC() && !!!data.forceSend) {
        return;
      }
      await UpdateSubscriberMeta(existingSubscriber.id, newSubscriberData.subscriber_meta);
    }
  } catch (e) {
    console.error("Error in CreateNewSubscriber: ", e);
    throw new Error("Error in CreateNewSubscriber");
  }

  let emailData = {
    brand_name: siteData.siteName,
    logo_url: await GetSiteLogoURL(siteData.siteURL, siteData.logo, base),
    email_code: emailCode,
    action: "subscription",
  };

  let resp = await SendEmailWithTemplate(
    emailCodeTemplate,
    emailData,
    email,
    `[Important] Verify code to subscribe for ${emailData.brand_name} updates`,
    `Your verification code is: ${emailData.email_code}`,
  );
  if (resp.error) {
    throw new Error("Error in SendEmailWithTemplate: " + resp.error);
  }
  return { message: "Email sent successfully" };
}

async function emailSubscribeNew(data) {
  const type = data.type;
  const email = data.userEmail;
  if (!ValidateEmail(email)) {
    return json({ message: "Invalid email address" }, { status: 400 });
  }

  let existingSubscriber = await GetSubscriberByEmailAndType(email, type);
  if (!!!existingSubscriber || existingSubscriber.subscriber_status != "ACTIVE") {
    try {
      await enrollSubscriber(email, existingSubscriber, data);
    } catch (e) {
      console.error("Error in enrollSubscriber: ", e);
      return json({ message: "Error in enrollSubscriber" }, { status: 200 });
    }
  }

  let newSubscriptionData = {
    email: email,
    type: type,
    monitorTags: data.monitorTags,
  };

  if (data.allMonitors) {
    newSubscriptionData.monitorTags = "_";
  }

  try {
    await CreateNewSubscription(newSubscriptionData);
  } catch (e) {
    console.error("Error in CreateNewSubscription: ", e);
  }
  return json({ message: "Subscription created successfully" }, { status: 200 });
}

async function emailUnsubscribe(data) {
  const type = data.type;
  const email = data.userEmail;
  if (!ValidateEmail(email)) {
    return json({ message: "Invalid email address" }, { status: 400 });
  }

  let existingSubscriber = await GetSubscriberByEmailAndType(email, type);
  if (!!!existingSubscriber) {
    return json({ message: "No active subscription 2found" }, { status: 400 });
  }

  await RemoveAllSubscriptions(existingSubscriber.id);
  return json({ message: "Unsubscribed successfully" }, { status: 200 });
}
async function fetchData(data) {
  const type = data.type;
  const email = data.userEmail;
  if (!ValidateEmail(email)) {
    return json({ message: "Invalid email address" }, { status: 400 });
  }

  let existingSubscriber = await GetSubscriberByEmailAndType(email, type);
  if (!!!existingSubscriber) {
    return json({ message: "No active subscription found" }, { status: 400 });
  }

  let subscriberMeta = JSON.parse(existingSubscriber.subscriber_meta);
  let generateAt = parseInt(subscriberMeta.generated_at);
  //generateAt has expired
  if (generateAt < GetNowTimestampUTC()) {
    existingSubscriber.subscriber_status = "";
  }

  let monitors = [];
  let allSubscriptions = await GetSubscriptionsBySubscriberID(existingSubscriber.id);
  if (!!allSubscriptions) {
    monitors = allSubscriptions.map((item) => {
      return item.subscriptions_monitors;
    });
  }

  return json({ email, status: existingSubscriber.subscriber_status, monitors }, { status: 200 });
}

async function confirmSubscription(data) {
  const type = data.type;
  const email = data.userEmail;
  const code = data.confirmCode;

  let existingSubscriber = await GetSubscriberByEmailAndType(email, type);
  if (!!!existingSubscriber) {
    return json({ message: "No active subscription found" }, { status: 400 });
  }

  let subscriberMeta = JSON.parse(existingSubscriber.subscriber_meta);
  let generateAt = parseInt(subscriberMeta.generated_at);
  if (generateAt < GetNowTimestampUTC()) {
    return json({ message: "Code expired" }, { status: 400 });
  }
  if (subscriberMeta.email_code != code) {
    return json({ message: "Invalid code" }, { status: 400 });
  }
  await UpdateSubscriberStatus(existingSubscriber.id, "ACTIVE");

  return await fetchData(data);
}

async function sendUnsubscribeCode(data) {
  const type = data.type;
  const email = data.userEmail;
  let emailCode = GenerateRandomNumber(6);
  let siteData = await GetAllSiteData();

  let existingSubscriber = await GetSubscriberByEmailAndType(email, type);
  if (!!!existingSubscriber) {
    return json({ message: "No active subscription found" }, { status: 400 });
  }

  let subscriberMeta = JSON.parse(existingSubscriber.subscriber_meta);
  //if unsubscribe_code and unsubscribe_generated_at is present and not expired then return
  if (subscriberMeta.unsubscribe_code && subscriberMeta.unsubscribe_generated_at) {
    const generatedAt = parseInt(subscriberMeta.unsubscribe_generated_at);
    if (generatedAt > GetNowTimestampUTC() && !!!data.forceSend2) {
      return json({ message: "Unsubscribe code is valid", code: subscriberMeta.unsubscribe_code }, { status: 200 });
    }
  }

  subscriberMeta.unsubscribe_code = emailCode;
  subscriberMeta.unsubscribe_generated_at = GetNowTimestampUTC() + 86400;

  try {
    await UpdateSubscriberMeta(existingSubscriber.id, subscriberMeta);
  } catch (e) {
    console.error("Error in UpdateSubscriberMeta: ", e);
    return json({ message: "Error in UpdateSubscriberMeta" }, { status: 500 });
  }

  let emailData = {
    brand_name: siteData.siteName,
    logo_url: await GetSiteLogoURL(siteData.siteURL, siteData.logo, base),
    email_code: emailCode,
    action: "unsubscribe",
  };

  let resp = await SendEmailWithTemplate(
    emailCodeTemplate,
    emailData,
    email,
    `[Important] Verify code to unsubscribe from ${emailData.brand_name} updates`,
    `Your verification code is: ${emailData.email_code}`,
  );
  if (resp.error) {
    console.error("Error in SendEmailWithTemplate: ", resp.error);
    return json({ message: "Error in SendEmailWithTemplate" }, { status: 500 });
  }
  return json({ message: "Unsubscribe code sent successfully" }, { status: 200 });
}

async function confirmUnSubscription(data) {
  const type = data.type;
  const email = data.userEmail;
  const code = data.unsubscribeCode;

  let existingSubscriber = await GetSubscriberByEmailAndType(email, type);
  if (!!!existingSubscriber) {
    return json({ message: "No active subscription found" }, { status: 400 });
  }

  let subscriberMeta = JSON.parse(existingSubscriber.subscriber_meta);
  let generateAt = parseInt(subscriberMeta.unsubscribe_generated_at);
  if (generateAt < GetNowTimestampUTC()) {
    return json({ message: "Code expired" }, { status: 400 });
  }
  if (subscriberMeta.unsubscribe_code != code) {
    return json({ message: "Invalid code" }, { status: 400 });
  }
  await RemoveAllSubscriptions(existingSubscriber.id);
  await DeleteSubscriberByID(existingSubscriber.id);
  return json({ message: "Unsubscribed successfully" }, { status: 200 });
}

export async function POST({ request, params }) {
  const data = await request.json();
  const action = params.action;
  const type = data.type;

  if (type != "email") {
    return json({ message: "Invalid type" }, { status: 400 });
  }

  try {
    if (action == "subscribe") {
      return await emailSubscribeNew(data);
    } else if (action == "unsubscribe") {
      return await sendUnsubscribeCode(data);
    } else if (action == "fetch") {
      return await fetchData(data);
    } else if (action == "confirm_subscription") {
      return await confirmSubscription(data);
    } else if (action == "confirm_unsubscribe") {
      return await confirmUnSubscription(data);
    }
  } catch (e) {
    console.error("Error in emailSubscribeNew: ", e);
    return json({ message: "Error in creating email subscription" }, { status: 500 });
  }

  return json({ message: "Invalid action" }, { status: 400 });
}
