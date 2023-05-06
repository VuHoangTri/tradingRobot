import express, { Request, Response } from "express";
import bodyParser from "body-parser";

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
  if (bot.enabled)
    res.send({ status: 'running' })
  else res.send({ status: 'stoping' })
});

app.post("/run", async function (req, res) {
  bot.enabled = true;
  res.send("Đã chạy");
});

app.post("/stop", async function (req, res) {
  bot.enabled = false;
  res.send("Đã dừng");
});

app.post("/getPosMain", async function (req, res) {
  const response = await traderAPIs[0].getMyPositions();
  res.send(response?.result.list);
})
app.get("/getPosMain", async function (req, res) {
  const response = await traderAPIs[0].getMyPositions();
  res.send(response?.result.list);
})

app.post("/getTotalPnlMain", async function (req, res) {
  const response = await traderAPIs[0].getTotalPnL({});
  res.send({ pnl: response });
})
app.get("/getTotalPnlMain", async function (req, res) {
  const time = req.query.time;
  let response: any;
  if (time)
    response = await traderAPIs[0].getTotalPnL({ time: Number(time) });
  else
    response = await traderAPIs[0].getTotalPnL({});
  res.send({ pnl: response });
})

app.post("/getTotalPnlMain", async function (req, res) {
  const response = await traderAPIs[0].getTotalPnL({});
  res.send({ pnl: response });
})
app.post("/getTotalPnlAcc1", async function (req, res) {
  const response = await traderAPIs[1].getTotalPnL({});
  res.send({ pnl: response });
})
app.post("/getTotalPnlAcc2", async function (req, res) {
  const response = await traderAPIs[2].getTotalPnL({});
  res.send({ pnl: response });
})
app.post("/getTradeFeeMain", async function (req, res) {
  const response = await traderAPIs[0].getTotalTradeFee({});
  res.send({ pnl: response });
})

app.get("/getTotalPnlAcc", async function (req, res) {
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
})

app.get("/getTradeFeeAcc", async function (req, res) {
  const time = req.query.time;
  const index = Number(req.query.acc) - 1;
  let response: any;
  if (index !== undefined)
    if (index > -1)
      response = await traderAPIs[index].getTotalTradeFee({ time: Number(time) });
    else response = "Please provide index of account you want to see!";
  else response = await traderAPIs[index].getTotalTradeFee({});
  res.send({ fee: response });
})

app.post("/getPosSub1", async function (req, res) {
  const response = await traderAPIs[1].getMyPositions();
  res.send(response?.result.list);
})
app.get("/getPosSub1", async function (req, res) {
  const response = await traderAPIs[1].getMyPositions();
  res.send(response?.result.list);
})

app.post("/getPosSub2", async function (req, res) {
  const response = await traderAPIs[2].getMyPositions();
  res.send(response?.result.list);
})
app.get("/getPosSub2", async function (req, res) {
  const response = await traderAPIs[2].getMyPositions();
  res.send(response?.result.list);
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
  console.log(`[server]: Server is running at https://localhost:${port}`);
  await new Promise((r) => setTimeout(r, 4000));
  main();
});
