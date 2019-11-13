const version='1.0.2';
const contributor='KarimovDev';
const author='FreedomPrevails';
const github='https://github.com/FreedomPrevails/JSMTProxy';

const net = require('net');
const crypto = require('crypto');
const secret = 'b0cbcef5a486d9636472ac27f8e11a9d';
const port = 8989;

const CON_TIMEOUT = 3 * 60000;
const MIN_IDLE_SERVERS = 5;

const telegram_servers = ["149.154.175.50", "149.154.167.51", "149.154.175.100", "149.154.167.91", "149.154.171.5", "149.154.167.99"];
const telegram_idle_num = [MIN_IDLE_SERVERS, MIN_IDLE_SERVERS, MIN_IDLE_SERVERS, MIN_IDLE_SERVERS, MIN_IDLE_SERVERS, MIN_IDLE_SERVERS];

const server_idle_cons = [];
telegram_servers.forEach((el, i) => server_idle_cons[i] = []);

const reverseInplace = buffer => {
  for (let i = 0, j = buffer.length - 1; i < j; ++i, --j) {
    const temp = buffer[j];
    buffer[j] = buffer[i];
    buffer[i] = temp;
  }
}

const create_idle_server = (id, ip) => {
	const client = new net.Socket();
	client.setKeepAlive(true);

	client.on('timeout', () => {
		client.destroy();
	});

	client.connect(443, ip, () => {
		client.session = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

		let random_buf = crypto.randomBytes(64);
		while (true) {
			let val = (random_buf[3] << 24) | (random_buf[2] << 16) | (random_buf[1] << 8) | (random_buf[0]);
			let val2 = (random_buf[7] << 24) | (random_buf[6] << 16) | (random_buf[5] << 8) | (random_buf[4]);
			if (random_buf[0] != 0xef &&
				val != 0x44414548 &&
				val != 0x54534f50 &&
				val != 0x20544547 &&
				val != 0x4954504f &&
				val != 0xeeeeeeee &&
				val2 != 0x00000000) {
				random_buf[56] = random_buf[57] = random_buf[58] = random_buf[59] = 0xef;
				break;
			}
			random_buf = crypto.randomBytes(64);
		}

		let keyIv = Buffer.allocUnsafe(48);
		random_buf.copy(keyIv, 0, 8);

		let encryptKey_server = Buffer.allocUnsafe(32);
		keyIv.copy(encryptKey_server, 0, 0);

		let encryptIv_server = Buffer.allocUnsafe(16);
		keyIv.copy(encryptIv_server, 0, 32);

		reverseInplace(keyIv);

		let decryptKey_server = Buffer.allocUnsafe(32);
		keyIv.copy(decryptKey_server, 0, 0);

		let decryptIv_server = Buffer.allocUnsafe(16);
		keyIv.copy(decryptIv_server, 0, 32);

		client.cipher_dec_server = crypto.createCipheriv('aes-256-ctr', decryptKey_server, decryptIv_server);
		client.cipher_enc_server = crypto.createCipheriv('aes-256-ctr', encryptKey_server, encryptIv_server);

		let packet_enc = client.cipher_enc_server.update(random_buf);
		random_buf.copy(packet_enc, 0, 0, 56);

		client.write(packet_enc, function() {
			server_idle_cons[id].push(client);
		});
	});

	client.on('error', (err) => {
		client.destroy();
	});

	client.on('data', (data) => {
		if (client.client_socket.writable) {
			let dec_packet = client.cipher_dec_server.update(data);
			let enc_packet = client.client_socket.cipher_enc_client.update(dec_packet);
			client.client_socket.write(enc_packet, () => {
			});
		} else {
			client.destroy();
		}
	});
	client.on('end', () => {
		if (client.client_socket != null) {
			client.client_socket.end();
		}
	});
}

setInterval(() => {
	telegram_servers.forEach((tgServer, i) => {
		if (server_idle_cons[i].length < telegram_idle_num[i]) {
			create_idle_server(i, tgServer);
		}
	});
}, 10);

const connListener = (socket) => {

	socket.setTimeout(CON_TIMEOUT);

	socket.on('error', (err) => {
		socket.destroy();
	});

	socket.on('timeout', () => {
		socket.destroy();
	});

	socket.on('end', () => {
		if (socket.server_socket != null) {
			socket.server_socket.destroy();
		}
	});

	socket.on('data', (data) => {

		if (socket.init == null && (data.length == 41 || data.length == 56)) {
			const client_ip = socket.remoteAddress.substr(7, socket.remoteAddress.length);
			socket.destroy();
			return;
		}

		if (socket.init == null && data.length < 64) {
			socket.destroy();
			return;
		}

		if (socket.init == null) {
			let buf64 = Buffer.allocUnsafe(64);
			data.copy(buf64);

			let keyIv = Buffer.allocUnsafe(48);
			buf64.copy(keyIv, 0, 8);

			let decryptKey_client = Buffer.allocUnsafe(32);
			keyIv.copy(decryptKey_client, 0, 0);

			let decryptIv_client = Buffer.allocUnsafe(16);
			keyIv.copy(decryptIv_client, 0, 32);

			reverseInplace(keyIv);

			let encryptKey_client = Buffer.allocUnsafe(32);
			keyIv.copy(encryptKey_client, 0, 0);

			let encryptIv_client = Buffer.allocUnsafe(16);
			keyIv.copy(encryptIv_client, 0, 32);

			let binSecret = Buffer.from(secret, 'hex');

			decryptKey_client = crypto.createHash('sha256').update(Buffer.concat([decryptKey_client, binSecret])).digest();
			encryptKey_client = crypto.createHash('sha256').update(Buffer.concat([encryptKey_client, binSecret])).digest();

			socket.cipher_dec_client = crypto.createCipheriv('aes-256-ctr', decryptKey_client, decryptIv_client);
			socket.cipher_enc_client = crypto.createCipheriv('aes-256-ctr', encryptKey_client, encryptIv_client);

			let dec_auth_packet = socket.cipher_dec_client.update(buf64);
			socket.dcId = Math.abs(dec_auth_packet.readInt16LE(60)) - 1;

			for (const i = 0; i < 4; i++) {
				if (dec_auth_packet[56 + i] != 0xef) {
					socket.destroy();
					return;
				}
			}

			if (socket.dcId > 4 || socket.dcId < 0) {
				socket.destroy();
				return;
			}

			data = data.slice(64, data.length);
			socket.init = true;
		}

		const payload = socket.cipher_dec_client.update(data);

		if (socket.server_socket == null) {
			if (server_idle_cons[socket.dcId].length > 0) {

				do {
					socket.server_socket = server_idle_cons[socket.dcId].shift();
					if (socket.server_socket && !socket.server_socket.writable) {
						socket.server_socket.destroy();
					}
				} while (!socket.server_socket.writable);

				// con_count[socket.dcId]++;
				socket.server_socket.setTimeout(CON_TIMEOUT);
				socket.server_socket.setKeepAlive(false);
				socket.server_socket.client_socket = socket;
			} else {
				console.log('SHORT ON IDLE SERVER CONNECTIONS! dcId:', socket.dcId + 1);
				socket.destroy();
				return;
			}
		}

		let enc_payload = socket.server_socket.cipher_enc_server.update(payload);
		if (socket.server_socket.writable) {
			socket.server_socket.write(enc_payload, () => {
			});
		} else {
			socket.server_socket.destroy();
			socket.destroy();
		}
	});

}

net.createServer(connListener).listen(port);

console.log(`mtproxy started on port: ${port}`);
