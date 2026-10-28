/**
 * Cliente WebSocket mínimo (RFC 6455) sem dependências externas.
 *
 * O SDK da Ulanzi usa o pacote "ws" só para conectar no Ulanzi Studio
 * (ws://127.0.0.1:3906). Este arquivo substitui o "ws" com a mesma interface
 * que o SDK usa: onopen, onclose, onerror, onmessage, send(), close() e
 * readyState. Assim o plugin funciona sem precisar de "npm install".
 */
import net from "net";
import crypto from "crypto";

const GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

export default class MiniWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  constructor(url) {
    this.readyState = MiniWebSocket.CONNECTING;
    this.onopen = null;
    this.onclose = null;
    this.onerror = null;
    this.onmessage = null;

    const u = new URL(url);
    const key = crypto.randomBytes(16).toString("base64");
    this._expectedAccept = crypto
      .createHash("sha1")
      .update(key + GUID)
      .digest("base64");
    this._buf = Buffer.alloc(0);
    this._frag = [];
    this._fragOp = 1;
    this._handshakeDone = false;

    const socket = net.connect(Number(u.port || 80), u.hostname, () => {
      socket.write(
        `GET ${u.pathname || "/"}${u.search || ""} HTTP/1.1\r\n` +
          `Host: ${u.host}\r\n` +
          "Upgrade: websocket\r\n" +
          "Connection: Upgrade\r\n" +
          `Sec-WebSocket-Key: ${key}\r\n` +
          "Sec-WebSocket-Version: 13\r\n\r\n"
      );
    });
    socket.setNoDelay(true);
    socket.on("data", (d) => this._onData(d));
    socket.on("error", (e) =>
      this._fire("onerror", { message: e.message, code: e.code })
    );
    socket.on("close", () => {
      if (this.readyState !== MiniWebSocket.CLOSED) {
        this.readyState = MiniWebSocket.CLOSED;
        this._fire("onclose", { code: 1006 });
      }
    });
    this._socket = socket;
  }

  _fire(name, evt) {
    try {
      if (typeof this[name] === "function") this[name](evt);
    } catch (err) {
      console.error("[miniWs] erro no handler", name, err);
    }
  }

  _onData(chunk) {
    this._buf = Buffer.concat([this._buf, chunk]);

    if (!this._handshakeDone) {
      const end = this._buf.indexOf("\r\n\r\n");
      if (end < 0) return;
      const head = this._buf.subarray(0, end).toString("utf8");
      this._buf = this._buf.subarray(end + 4);
      if (!/^HTTP\/1\.1 101/.test(head) || !head.includes(this._expectedAccept)) {
        this._fire("onerror", { message: "Handshake WebSocket recusado" });
        this._socket.destroy();
        return;
      }
      this._handshakeDone = true;
      this.readyState = MiniWebSocket.OPEN;
      this._fire("onopen", {});
    }

    this._parseFrames();
  }

  _parseFrames() {
    for (;;) {
      const b = this._buf;
      if (b.length < 2) return;
      const fin = (b[0] & 0x80) !== 0;
      const op = b[0] & 0x0f;
      const masked = (b[1] & 0x80) !== 0;
      let len = b[1] & 0x7f;
      let off = 2;
      if (len === 126) {
        if (b.length < 4) return;
        len = b.readUInt16BE(2);
        off = 4;
      } else if (len === 127) {
        if (b.length < 10) return;
        len = Number(b.readBigUInt64BE(2));
        off = 10;
      }
      let mask = null;
      if (masked) {
        if (b.length < off + 4) return;
        mask = b.subarray(off, off + 4);
        off += 4;
      }
      if (b.length < off + len) return;

      const payload = Buffer.from(b.subarray(off, off + len));
      this._buf = b.subarray(off + len);
      if (mask) for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i & 3];

      if (op === 0x8) {
        // close
        if (this.readyState === MiniWebSocket.OPEN) this._sendFrame(0x8, payload.subarray(0, 2));
        this.readyState = MiniWebSocket.CLOSED;
        this._socket.end();
        this._fire("onclose", { code: payload.length >= 2 ? payload.readUInt16BE(0) : 1005 });
        return;
      }
      if (op === 0x9) {
        // ping -> pong
        this._sendFrame(0xa, payload);
        continue;
      }
      if (op === 0xa) continue; // pong

      if (op === 0x1 || op === 0x2) {
        this._fragOp = op;
        this._frag = [payload];
      } else if (op === 0x0) {
        this._frag.push(payload);
      } else {
        continue;
      }

      if (fin) {
        const data = Buffer.concat(this._frag);
        this._frag = [];
        this._fire("onmessage", {
          data: this._fragOp === 0x1 ? data.toString("utf8") : data,
        });
      }
    }
  }

  _sendFrame(op, payload) {
    const len = payload.length;
    let header;
    if (len < 126) {
      header = Buffer.alloc(2);
      header[1] = 0x80 | len;
    } else if (len < 65536) {
      header = Buffer.alloc(4);
      header[1] = 0x80 | 126;
      header.writeUInt16BE(len, 2);
    } else {
      header = Buffer.alloc(10);
      header[1] = 0x80 | 127;
      header.writeBigUInt64BE(BigInt(len), 2);
    }
    header[0] = 0x80 | op;
    const mask = crypto.randomBytes(4);
    const out = Buffer.alloc(len);
    for (let i = 0; i < len; i++) out[i] = payload[i] ^ mask[i & 3];
    this._socket.write(Buffer.concat([header, mask, out]));
  }

  send(data) {
    if (this.readyState !== MiniWebSocket.OPEN) return;
    this._sendFrame(0x1, Buffer.from(String(data), "utf8"));
  }

  close(code = 1000) {
    if (this.readyState === MiniWebSocket.OPEN) {
      const p = Buffer.alloc(2);
      p.writeUInt16BE(code);
      this._sendFrame(0x8, p);
      this.readyState = MiniWebSocket.CLOSING;
      setTimeout(() => this._socket.destroy(), 1000).unref();
    } else if (this.readyState === MiniWebSocket.CONNECTING) {
      this._socket.destroy();
    }
  }
}
