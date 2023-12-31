const express = require("express");
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");
require("dotenv").config();
const path = require("path");
const request = require("request");
const fs = require("fs");
const razorpay = require("razorpay");

const instance = new razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.set("view engine", "ejs");

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/donate", (req, res) => {
  res.render("donate", {
    key_id: process.env.RAZORPAY_KEY_ID,
    subscription: { id: null },
  });
});

app.get("/terms", (req, res) => {
  res.render("terms");
});

app.get("/payment", (req, res) => {
  res.render("payment", {
    key_id: process.env.RAZORPAY_KEY_ID,
    subscription_id: null,
    order_id: null,
  });
});

app.get("/rahul", (req, res) => {
  res.render("paymentStatus");
});

app.get("/:page", (req, res) => {
  const pageName = req.params.page;
  fs.access(__dirname + "/" + pageName + ".html", fs.F_OK, (err) => {
    if (err) {
      res.sendFile(__dirname + "/404.html");
      return;
    } else {
      res.sendFile(__dirname + "/" + pageName + ".html");
    }
  });
});

async function mainMail(name, email, phone, subject, message) {
  const transporter = await nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.PASSWORD,
    },
  });
  const mailOption = {
    from: process.env.GMAIL_USER,
    to: process.env.GMAIL_USER,
    subject: subject,
    html:
      `
      Email : ` +
      email +
      `\n
      Name: ` +
      name +
      `\n
      Phone: ` +
      phone +
      `\n
      Message: ` +
      message,
  };
  try {
    await transporter.sendMail(mailOption);
    return Promise.resolve("Message Sent Successfully!");
  } catch (error) {
    return Promise.reject(error);
  }
}

app.post("/contact", async (req, res) => {
  const name = req.body.name;
  const phone = req.body.phone;
  const email = req.body.email;
  const message = req.body.message;
  const subject = req.body.subject;

  try {
    await mainMail(name, email, phone, subject, message);
    res.send(
      "<script>alert('Message Sent Successfully!'); window.location.href = '/contact';</script>"
    );
  } catch (error) {
    console.log(error);
    res.send(
      "<script>alert('Message Sent Successfully!'); window.location.href = '/contact';</script>"
    );
  }
});

app.post("/create/orderId", (req, res) => {
  console.log(req.body);
  var amount = req.body.money;
  if (amount === "custom") {
    final_amount = req.body.custom;
  } else {
    final_amount = req.body.money;
  }
  instance.orders.create(
    {
      amount: req.body.amount, // amount in the smallest currency unit
      currency: "INR",
      receipt: "order_rcptid_11",
    },
    function (err, order) {
      console.log(req.body);
      if (err) {
        console.log(err);
      } else {
        console.log(order);
        res.send({ orderId: order.id, amount: order.amount });
      }
    }
  );
});

app.post("/get/paymentDetails", (req, res) => {
  console.log(req.body);
  generated_signature = hmac_sha256(
    req.body.razorpay_order_id + "|" + req.body.razorpay_payment_id,
    process.env.RAZORPAY_KEY_SECRET
  );

  if (generated_signature == req.body.razorpay_signature) {
    res.render("paymentStatus", {
      status: "success",
      paymentDetails: req.body,
    });
  } else {
    res.render("paymentStatus", {
      status: "failed",
      paymentDetails: req.body,
    });
  }
});

app.post("/create/subscriptionId", (req, res) => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  // payment gateway charges 3% extra
  const amount = req.body.amount;
  const amountWithCharges = amount * 1.03; // amount in the smallest currency unit
  console.log(req.body);
  var bearCh = req.body.bearCharges;
  var final_amount;
  if (bearCh === true) {
    final_amount = amountWithCharges;
  } else {
    final_amount = amount;
  }
  instance.plans.create(
    {
      period: "monthly",
      interval: 1,
      item: {
        name: req.body.name,
        description: "Test plan description",
        amount: final_amount,
        currency: "INR",
      },
    },
    function (err, plan) {
      if (err) {
        console.log(err);
        console.log(plan);
      } else {
        // res.json(plan);
        instance.subscriptions.create(
          {
            plan_id: plan.id,
            customer_notify: 1,
            total_count: 5,
            // notify_info: {
            //   notify_email: req.body.email,
            //   notify_phone: req.body.phone,
            // },
          },
          function (err, subscription) {
            if (err) {
              console.log(err);
            } else {
              console.log(subscription);

              console.log(final_amount);
              instance.orders.create(
                {
                  amount: final_amount, // amount in the smallest currency unit
                  currency: "INR",
                  receipt: "order_rcptid_11",
                },
                function (err, order) {
                  res.send({
                    key_id: process.env.RAZORPAY_KEY_ID,
                    subscription_id: subscription.id,
                    order_id: order.id,
                    amount: order.amount,
                  });
                }
              );
            }
          }
        );
      }
    }
  );
});

const key_id = process.env.RAZORPAY_KEY_ID;

app.listen(3000, () => {
  console.log("Successfully started listening on port 3000");
});
