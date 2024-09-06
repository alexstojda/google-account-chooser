//
// Copyright 2016-2020 - Sverrir A. Berg <sab@keilir.com>
// See LICENSE file for more information.
//

const DEBUG = false;
const DELAY_LOGIN_MILLISECONDS = 500;

if (DEBUG) console.log("google_account.js - in like Flynn!");

const gacGetDomain = () => {
  try {
    let domain = document.referrer.split('/')[2];
    if (domain === undefined) {
      return "test.html";
    }
    return domain;
  } catch (err) {
    if (DEBUG) console.log("Problem getting domain from referrer:", err.mesasge);
    return "NONE";
  }
};

const gacGetLoginElements = () => document.querySelectorAll('[data-identifier]');


const gacPerformLogin = email => {
  if (DEBUG) console.log("gacPerformLogin: %s", email);
  let loginElements = gacGetLoginElements();


  // Find and click if the account match given email
  for (let i = 0; i < loginElements.length; i++) {
    let el = loginElements[i];
    let elEmail = el.getAttribute("data-identifier");
    if (DEBUG) console.log("gacFoundEntry: %s", elEmail);
    if (elEmail === email) {
      if (DEBUG) console.log("clicking button for email:", email);
      el.click();
      return true;
    }
  }

  if (DEBUG) console.log("gacPerformLogin: did not match any");
  return false;
};

const gacClickHandler = (domain, el) => () => {
  let email = el.getAttribute("data-identifier");
  if (DEBUG) console.log("clickHandler: registering %s -> %s", domain, email);
  chrome.runtime.sendMessage(
    {
      action: "setEmail",
      email: email,
      domain: domain
    },
    () => {
      if (DEBUG) console.log("clickHandler: done registering %s -> %s", domain, email);
    }
  );
};

const gacStartup = () => {
  let domain = gacGetDomain();
  let loginElements = gacGetLoginElements();

  // Register click handlers
  loginElements.forEach(
    el => el.addEventListener("click", gacClickHandler(domain, el), false)
  );

  // Auto click the first account if there is only one
  if (loginElements.length == 1) {
    setTimeout(() => {
      let el = loginElements[0];
      el.click();
    }, DELAY_LOGIN_MILLISECONDS);
    return;
  }

  // Try to see if we should log in automatically.
  chrome.runtime.sendMessage(
    {
      action: "getEmail",
      domain: domain
    },
    response => {
      if (response !== undefined) {
        if (response.email) {
          setTimeout(gacPerformLogin, DELAY_LOGIN_MILLISECONDS, response.email);
        }
      }
    }
  );
};

const clickFn = (selector, text) => () => {
  const nodes = document.querySelectorAll(selector);
  const el = Array.from(nodes).find(span => span.textContent.trim() === text);
  el.click()
};


const safelyAllowGCP = () => {
  const spans = document.querySelectorAll('span');
  if (Array.from(spans).find(span => span.textContent.trim() === 'Make sure you trust Google Cloud SDK')) {
    Array.from(spans).find(span => span.textContent.trim() === 'Allow').click()
  }
};

const main = () => {
  gacStartup();
  const map = {
    "https://accounts.google.com/signout/chrome/landing?": clickFn('span', 'Sign in again'),
    "https://accounts.google.com/signin/oauth/id?": clickFn('span', 'Continue'),
    "https://accounts.google.com/v3/signin/challenge/pk/presend?": clickFn('span', 'Continue'),
    "https://accounts.google.com/signout/chrome/landing?": clickFn('span', 'Sign in again'),
    "https://accounts.google.com/v3/signin/challenge/pk/presend?": clickFn('span', 'Continue'),
    "https://accounts.google.com/signin/oauth/consent?": safelyAllowGCP,
    "https://accounts.google.com/v3/signin/confirmidentifier?": clickFn('span', 'Next'),
    "https://app.strongdm.com/app/auth/native-continue?": _ => setTimeout(clickFn('div', 'Log in with Google'), 1000),
  }

  for (const [url, fn] of Object.entries(map)) {
    if (document.location.href.startsWith(url)) {
      setTimeout(fn, 100)
      return
    }
  }
};

main()

