import express, { Request, Response } from "express";
import bodyParser from "body-parser";

const app = express();
const port = 3000;
import { data, main } from "./main";
import { getAccountByBit, getWalletBalance } from "./bybit";

app.use(bodyParser.json()); // to support JSON-encoded bodies
app.use(
  bodyParser.urlencoded({
    // to support URL-encoded bodies
    extended: true,
  })
);

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

app.get("/", (req: Request, res: Response) => {
  res.json({
    status: 'runring'
  });
});

app.post("/run", async function (req, res) {
  data.botEnabled = true;
  res.send("Đã chạy");
});

app.post("/stop", async function (req, res) {
  data.botEnabled = false;
  res.send("Đã dừng");
});

app.get("/getSymbols", async function (req, res) {
  res.json(data.symbols);
});

app.get("/getData", async function (req, res) {
  res.json(data.prePosition);
});

app.get("/getClosedList", async function (req, res) {
  res.json(data.close);
});

app.get("/getOpenedList", async function (req, res) {
  res.json(data.open);
});

app.get("/getWallet", async function (req, res) {
  const response = await getWalletBalance();
  res.json(response);
})

app.get("/accountInfo", async function (req, res) {
  const response = await getAccountByBit();
  res.json(response);
})

app.listen(port, () => {
  console.log(`[server]: Server is running at https://localhost:${port}`);
});
main();