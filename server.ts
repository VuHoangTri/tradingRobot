import express, { Request, Response } from "express";
import bodyParser from "body-parser";

const version = 1;
const app = express();
const port = 3000;
import { bot, main } from "./main";
import { INTERVAL, traderAPIs } from "./constant";
// import { getAccountByBit, getMyPositions, getTradeFee, getWalletBalance } from "./bybit";
// import { getTotalPnL, getTotalTradeFee } from "./action";

app.use(bodyParser.json()); // to support JSON-encoded bodies
app.use(
  bodyParser.urlencoded({
    // to support URL-encoded bodies
    extended: true,
  })
);

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

app.get("/", (req: Request, res: Response) => {
  try {
    if (bot.enabled)
      res.send({ status: 'running' })
    else res.send({ status: 'stoping' })
  }
  catch (err: any) { res.send({ error: `Check lại đi ${err}` }) }
});

app.post("/run", async function (req, res) {
  try {
    bot.enabled = true;
    res.send("Đã chạy");
  }
  catch (err: any) { res.send({ error: `Check lại đi ${err}` }) }
});

app.post("/stop", async function (req, res) {
  try {
    bot.enabled = false;
    res.send("Đã dừng");
  }
  catch (err: any) { res.send({ error: `Check lại đi ${err}` }) }
});

app.post("/getPosMain", async function (req, res) {
  try {
    const response = await traderAPIs[0].getMyPositions();
    res.send(response?.result.list);
  }
  catch (err: any) { res.send({ error: `Check lại đi ${err}` }) }
})
app.get("/getPosMain", async function (req, res) {
  try {
    const response = await traderAPIs[0].getMyPositions();
    res.send(response?.result.list);
  }
  catch (err: any) { res.send({ error: `Check lại đi ${err}` }) }
})

app.post("/getTotalPnlMain", async function (req, res) {
  try {
    const response = await traderAPIs[0].getTotalPnL({});
    res.send({ pnl: response });
  }
  catch (err: any) { res.send({ error: `Check lại đi ${err}` }) }
})
app.get("/getTotalPnlMain", async function (req, res) {
  try {
    const time = req.query.time;
    let response: any;
    if (time)
      response = await traderAPIs[0].getTotalPnL({ time: Number(time) });
    else
      response = await traderAPIs[0].getTotalPnL({});
    res.send({ pnl: response });
  }
  catch (err: any) { res.send({ error: `Check lại đi ${err}` }) }
})

app.post("/getTotalPnlMain", async function (req, res) {
  try {
    const response = await traderAPIs[0].getTotalPnL({});
    res.send({ pnl: response });
  }
  catch (err: any) { res.send({ error: `Check lại đi ${err}` }) }
})
app.post("/getTotalPnlAcc1", async function (req, res) {
  try {
    const response = await traderAPIs[1].getTotalPnL({});
    res.send({ pnl: response });
  }
  catch (err: any) { res.send({ error: `Check lại đi ${err}` }) }
})
app.post("/getTotalPnlAcc2", async function (req, res) {
  try {
    const response = await traderAPIs[2].getTotalPnL({});
    res.send({ pnl: response });
  }
  catch (err: any) { res.send({ error: `Check lại đi ${err}` }) }
})
app.post("/getTradeFeeMain", async function (req, res) {
  try {
    const response = await traderAPIs[0].getTotalTradeFee({});
    res.send({ pnl: response });
  }
  catch (err: any) { res.send({ error: `Check lại đi ${err}` }) }
})

app.get("/getTotalPnlAcc", async function (req, res) {
  try {
    const time = req.query.time;
    const index = Number(req.query.acc);
    let response: any;
    if (time) {
      if (index > -1)
        response = await traderAPIs[index].getTotalPnL({ time: Number(time) });
      else response = "Please provide index of account you want to see!";
    }
    else
      response = await traderAPIs[index].getTotalPnL({});
    res.send({ pnl: response });
  }
  catch (err: any) { res.send({ error: `Check lại đi ${err}` }) }
})

app.get("/getTradeFeeAcc", async function (req, res) {
  try {
    const time = req.query.time;
    const index = Number(req.query.acc);
    let response: any;
    if (index !== undefined)
      if (index > -1)
        response = await traderAPIs[index].getTotalTradeFee({ time: Number(time) });
      else response = "Please provide index of account you want to see!";
    else response = await traderAPIs[index].getTotalTradeFee({});
    res.send({ fee: response });
  }
  catch (err: any) { res.send({ error: `Check lại đi ${err}` }) }
})

app.post("/getPosSub1", async function (req, res) {
  try {
    const response = await traderAPIs[1].getMyPositions();
    res.send(response?.result.list);
  }
  catch (err: any) { res.send({ error: `Check lại đi ${err}` }) }
})
app.get("/getPosSub1", async function (req, res) {
  try {
    const response = await traderAPIs[1].getMyPositions();
    res.send(response?.result.list);
  }
  catch (err: any) { res.send({ error: `Check lại đi ${err}` }) }
})

app.post("/getPosSub2", async function (req, res) {
  try {
    const response = await traderAPIs[2].getMyPositions();
    res.send(response?.result.list);
  }
  catch (err: any) { res.send({ error: `Check lại đi ${err}` }) }
})
app.get("/getPosSub2", async function (req, res) {
  try {
    const response = await traderAPIs[2].getMyPositions();
    res.send(response?.result.list);
  }
  catch (err: any) { res.send({ error: `Check lại đi ${err}` }) }
})

app.get("/stop", async function (req, res) {
  bot.enabled = false;
  res.send("Đã dừng");
});

// app.get("/getData", async function (req, res) {
//   res.json(data.prePosition);
// });
// app.post("/getData", async function (req, res) {
//   res.json(data.prePosition);
// });

// app.get("/getClosedList", async function (req, res) {
//   res.json(data.close);
// });

// app.get("/getOpenedList", async function (req, res) {
//   res.json(data.open);
// });

// app.get("/getWallet", async function (req, res) {
//   const response = await getWalletBalance(client);
//   res.json(response);
// })

// app.get("/accountInfo", async function (req, res) {
//   const response = await getAccountByBit();
//   res.json(response);
// })

app.listen(port, async () => {
  console.log(`[server]: Server is running at https://localhost:${port}, version : ${version}`);
  await new Promise((r) => setTimeout(r, 4000));
  main();
});
