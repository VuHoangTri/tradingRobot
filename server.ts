import express, { Request, Response } from "express";
import bodyParser from "body-parser";

const app = express();
const port = 3000;
import { client, data, main } from "./main";
import { getAccountByBit, getMyPositions, getWalletBalance } from "./bybit";
import { getTotalPnL } from "./action";

app.use(bodyParser.json()); // to support JSON-encoded bodies
app.use(
  bodyParser.urlencoded({
    // to support URL-encoded bodies
    extended: true,
  })
);

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

app.get("/", (req: Request, res: Response) => {
  if (data.botEnabled)
    res.send({ status: 'running' })
  else res.send({ status: 'stoping' })
});

app.post("/run", async function (req, res) {
  data.botEnabled = true;
  res.send("Đã chạy");
});

app.post("/stop", async function (req, res) {
  data.botEnabled = false;
  res.send("Đã dừng");
});

app.post("/getPosMain", async function (req, res) {
  const response = await getMyPositions(client[0]);
  res.send(response.result.list);
})
app.get("/getPosMain", async function (req, res) {
  const response = await getMyPositions(client[0]);
  res.send(response.result.list);
})

app.post("/getTotalPnl", async function (req, res) {
  const response = await getTotalPnL();
  res.send({ pnl: response });
})
app.get("/getTotalPnl", async function (req, res) {
  const response = await getTotalPnL();
  res.send({ pnl: response });
})

// app.get("/getPosCopy", async function (req, res) {
//   const listCopyPos: any = [];
//   const resPos: any = [];
//   for (const trader of bybitTrader) {
//     listCopyPos.push(await fetch(trader));
//   }
//   for (const list of listCopyPos) {
//     const response: any = await list.json();
//     resPos.push(...response.result.data)
//   }
//   res.send(resPos);
// })

app.post("/getPosSub1", async function (req, res) {
  const response = await getMyPositions(client[1]);
  res.send(response.result.list);
})
app.get("/getPosSub1", async function (req, res) {
  const response = await getMyPositions(client[1]);
  res.send(response.result.list);
})

app.post("/getPosSub2", async function (req, res) {
  const response = await getMyPositions(client[2]);
  res.send(response.result.list);
})
app.get("/getPosSub2", async function (req, res) {
  const response = await getMyPositions(client[2]);
  res.send(response.result.list);
})

app.get("/stop", async function (req, res) {
  data.botEnabled = false;
  res.send("Đã dừng");
});

app.get("/getSymbols", async function (req, res) {
  res.json(data.symbols);
});

app.get("/getData", async function (req, res) {
  res.json(data.prePosition);
});
app.post("/getData", async function (req, res) {
  res.json(data.prePosition);
});

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

app.listen(port, () => {
  console.log(`[server]: Server is running at https://localhost:${port}`);
});
main();