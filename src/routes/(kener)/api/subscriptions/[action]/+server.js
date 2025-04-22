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
  GenerateTokenWithExpiry,
  GetSubscriberByID,
  VerifyToken,
} from "$lib/server/controllers/controller.js";
import { base } from "$app/paths";

async function subscribe(data) {
  const decoded = await VerifyToken(data.token);
  if (!!!decoded) {
    return json({ message: "Invalid token" }, { status: 400 });
  }
  let email = decoded.email;
  if (!!!email) {
    return json({ message: "Invalid email" }, { status: 400 });
  }
  //subscriber_id
  let subscriber_id = decoded.subscriber_id;
  if (!!!subscriber_id) {
    return json({ message: "Invalid subscriber_id" }, { status: 400 });
  }

  //get subscriber by id
  let existingSubscriber = await GetSubscriberByID(subscriber_id);
  if (!!!existingSubscriber) {
    return json({ message: "No active subscription found" }, { status: 400 });
  }

  let monitors = data.monitors;

  if (data.allMonitors) {
    monitors = ["_"];
  }

  if (!!!monitors || monitors.length == 0) {
    //remove all subscriptions
    await RemoveAllSubscriptions(existingSubscriber.id);
    return json({ message: "Unsubscribed successfully" }, { status: 200 });
  }

  try {
    await CreateNewSubscription(subscriber_id, monitors);
  } catch (e) {
    console.error("Error in CreateNewSubscription: ", e);
    return json({ message: "Error in CreateNewSubscription" }, { status: 500 });
  }
  return json({ message: "Subscription created successfully" }, { status: 200 });
}
async function unsubscribe(token) {
  //decode token
  const decoded = await VerifyToken(token);
  if (!!!decoded) {
    return json({ message: "Invalid token" }, { status: 400 });
  }
  let email = decoded.email;
  if (!!!email) {
    return json({ message: "Invalid email" }, { status: 400 });
  }
  //subscriber_id
  let subscriber_id = decoded.subscriber_id;
  if (!!!subscriber_id) {
    return json({ message: "Invalid subscriber_id" }, { status: 400 });
  }

  //get subscriber by id
  let existingSubscriber = await GetSubscriberByID(subscriber_id);
  if (!!!existingSubscriber) {
    return json({ message: "No active subscription found" }, { status: 400 });
  }

  await RemoveAllSubscriptions(existingSubscriber.id);
  return json({ message: "Unsubscribed successfully" }, { status: 200 });
}
async function fetchData(token) {
  //decode token
  const decoded = await VerifyToken(token);
  if (!!!decoded) {
    return json({ message: "Invalid token" }, { status: 400 });
  }
  let email = decoded.email;
  if (!!!email) {
    return json({ message: "Invalid email" }, { status: 400 });
  }
  //subscriber_id
  let subscriber_id = decoded.subscriber_id;
  if (!!!subscriber_id) {
    return json({ message: "Invalid subscriber_id" }, { status: 400 });
  }

  //get subscriber by id
  let existingSubscriber = await GetSubscriberByID(subscriber_id);
  if (!!!existingSubscriber) {
    return json({ message: "No active subscription found" }, { status: 400 });
  }

  let monitors = [];
  let allSubscriptions = await GetSubscriptionsBySubscriberID(subscriber_id);
  if (!!allSubscriptions) {
    monitors = allSubscriptions.map((item) => {
      return item.subscriptions_monitors;
    });
  }

  return json({ monitors, email: existingSubscriber.subscriber_send }, { status: 200 });
}

async function login(email) {
  //if the email does not exists then create the user, return 200
  //if the email exists then return 200

  //validate email
  if (!ValidateEmail(email)) {
    return json({ message: "Invalid email address" }, { status: 400 });
  }

  let subscriberMeta = {
    email_code: GenerateRandomNumber(6),
  };

  const existingUser = await GetSubscriberByEmailAndType(email, "email");
  if (!!!existingUser) {
    let newSubscriberData = {
      subscriber_send: email,
      subscriber_type: "email",
      subscriber_status: "PENDING",
      subscriber_meta: JSON.stringify(subscriberMeta),
    };
    let newSubscriber = await CreateNewSubscriber(newSubscriberData);
    return json({ newUser: true, token: await GenerateTokenWithExpiry({ email }, "5m") }, { status: 200 });
  } else {
    await UpdateSubscriberMeta(existingUser.id, JSON.stringify(subscriberMeta));
  }

  //send email with code
  let siteData = await GetAllSiteData();
  let emailData = {
    brand_name: siteData.siteName,
    logo_url: await GetSiteLogoURL(siteData.siteURL, siteData.logo, base),
    email_code: subscriberMeta.email_code,
    action: "login",
  };
  let resp = await SendEmailWithTemplate(
    emailCodeTemplate,
    emailData,
    email,
    `[Important] Verify code to login to ${emailData.brand_name}`,
    `Your verification code is: ${emailData.email_code}`,
  );
  if (resp.error) {
    console.error("Error in SendEmailWithTemplate: ", resp.error);
    return json({ message: "Error sending email" }, { status: 500 });
  }

  return json({ newUser: false, token: await GenerateTokenWithExpiry({ email }, "1m") }, { status: 200 });
}

//verify token from jwt
async function verifyToken(token, code) {
  const decoded = await VerifyToken(token);
  if (!!!decoded) {
    return json({ message: "Invalid token" }, { status: 400 });
  }

  let email = decoded.email;
  if (!!!email) {
    return json({ message: "Invalid email" }, { status: 400 });
  }

  let existingSubscriber = await GetSubscriberByEmailAndType(email, "email");
  if (!!!existingSubscriber) {
    return json({ message: "Invalid User" }, { status: 400 });
  }

  let subscriberMeta = JSON.parse(existingSubscriber.subscriber_meta);
  let storeCode = subscriberMeta.email_code;
  if (!!!storeCode) {
    return json({ message: "Invalid Data" }, { status: 400 });
  }
  if (storeCode != code) {
    return json({ message: "Invalid Code" }, { status: 400 });
  }

  //update the subscriber status to active
  await UpdateSubscriberStatus(existingSubscriber.id, "ACTIVE");
  await UpdateSubscriberMeta(existingSubscriber.id, JSON.stringify({}));

  //create a new token

  return json(
    {
      token: await GenerateTokenWithExpiry(
        {
          email: email,
          subscriber_id: existingSubscriber.id,
        },
        "1y",
      ),
    },
    { status: 200 },
  );
}

export async function POST({ request, params }) {
  const data = await request.json();
  const action = params.action;
  const type = data.type;

  try {
    if (action == "login") {
      return await login(data.userEmail);
    } else if (action == "verify") {
      return await verifyToken(data.token, data.code);
    } else if (action == "subscribe") {
      return await subscribe(data);
    } else if (action == "unsubscribe") {
      return await unsubscribe(data.token);
    } else if (action == "fetch") {
      return await fetchData(data.token);
    }
  } catch (e) {
    return json({ message: "Error in creating email subscription" }, { status: 500 });
  }

  return json({ message: "Invalid action" }, { status: 400 });
}
