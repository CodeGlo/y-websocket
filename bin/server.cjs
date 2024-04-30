#!/usr/bin/env node

const WebSocket = require("ws");
const http = require("http");
const number = require("lib0/number");
const wss = new WebSocket.Server({ noServer: true });
const setupWSConnection = require("./utils.cjs").setupWSConnection;
const handleUpdateByApi = require("./utils.cjs").handleUpdateByApi;

const host = process.env.HOST || "localhost";
const port = number.parseInt(process.env.PORT || "1234");

const server = http.createServer(async (_request, response) => {
	if (_request.url === "/update" && _request.method === "POST") {
		const body = await getBody(_request);
		console.log(body);
		// handleUpdateByApi(body.docName, body.update);
		response.writeHead(200);
		response.end();
	} else {
		response.writeHead(200, { "Content-Type": "text/plain" });
		response.end("okay");
	}
});

wss.on("connection", setupWSConnection);

server.on("upgrade", (request, socket, head) => {
	// You may check auth of request here..
	// Call `wss.HandleUpgrade` *after* you checked whether the client has access
	// (e.g. by checking cookies, or url parameters).
	// See https://github.com/websockets/ws#client-authentication
	wss.handleUpgrade(
		request,
		socket,
		head,
		/** @param {any} ws */ (ws) => {
			wss.emit("connection", ws, request);
		}
	);
});

server.listen(port, host, () => {
	console.log(`running at '${host}' on port ${port}`);
});

const getBody = async (req) => {
	return new Promise((resolve, reject) => {
		let body = "";
		req.on("data", (chunk) => {
			body += chunk.toString();
		});
		req.on("end", () => {
			try {
				resolve(JSON.parse(body));
			} catch (err) {
				console.log("failed to json parse req body");
				resolve(body);
			}
		});
	});
};
