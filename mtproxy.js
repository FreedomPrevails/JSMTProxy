const version='1.0.0';
const author='FreedomPrevails';
const github='https://github.com/FreedomPrevails/JSMTProxy';

const net = require('net');
const crypto = require('crypto');
const exec = require('child_process').exec;
const process = require('process');
const fs = require('fs');

const CON_TIMEOUT = 5 * 60000; //5 Mins
const REPORT_CON_SEC = 10;
const MIN_IDLE_SERVERS = 1;

exec('/usr/bin/prlimit --pid ' + process.pid + ' --nofile=81920:81920', (error, stdout, stderr) => {});

var telegram_servers = ["149.154.175.50", "149.154.167.51", "149.154.175.100", "149.154.167.91", "149.154.171.5"];
var telegram_idle_num = [MIN_IDLE_SERVERS, MIN_IDLE_SERVERS, MIN_IDLE_SERVERS, MIN_IDLE_SERVERS, MIN_IDLE_SERVERS];

var server_idle_cons = [];
for (let i = 0; i < telegram_servers.length; i++) {
    server_idle_cons[i] = [];
}

var con_count = [];
for (let i = 0; i < telegram_servers.length; i++) {
    con_count.push(0);
}

var configObj = JSON.parse(fs.readFileSync('config.json', 'utf8'));
var binSecret = Buffer.from(configObj.secret, 'hex');

function reverseInplace(buffer) {
    for (var i = 0, j = buffer.length - 1; i < j; ++i, --j) {
        var t = buffer[j]
        buffer[j] = buffer[i]
        buffer[i] = t
    }
}

function NewClientSession() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function AllocBufs() {

    let keyIv = Buffer.allocUnsafe(48);
    let decryptKey = Buffer.allocUnsafe(32);
    let decryptIv = Buffer.allocUnsafe(16);
    let encryptKey = Buffer.allocUnsafe(32);
    let encryptIv = Buffer.allocUnsafe(16);

    return [keyIv, decryptKey, encryptKey, decryptIv, encryptIv];

}

function UpdateKey(Key) {
    return crypto.createHash('sha256').update(Buffer.concat([Key, binSecret])).digest();
}



function NewRandomBuf() {
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
    return random_buf;
}

function InitCrypto(buf, updateKeys) {
    let [keyIv, decryptKey, encryptKey, decryptIv, encryptIv] = AllocBufs();

    buf.copy(keyIv, 0, 8);
    if (updateKeys == true) {

        keyIv.copy(decryptKey, 0, 0);
        keyIv.copy(decryptIv, 0, 32);

        reverseInplace(keyIv);

        keyIv.copy(encryptKey, 0, 0);
        keyIv.copy(encryptIv, 0, 32);

        decryptKey = UpdateKey(decryptKey);
        encryptKey = UpdateKey(encryptKey);

    } else {

        keyIv.copy(encryptKey, 0, 0);
        keyIv.copy(encryptIv, 0, 32);

        reverseInplace(keyIv);

        keyIv.copy(decryptKey, 0, 0);
        keyIv.copy(decryptIv, 0, 32);

    }

    cipher_dec = crypto.createCipheriv('aes-256-ctr', decryptKey, decryptIv);
    cipher_enc = crypto.createCipheriv('aes-256-ctr', encryptKey, encryptIv);
    return [cipher_dec, cipher_enc];
}


function create_idle_server(id, ip) {
    let client = new net.Socket();
    client.setKeepAlive(true);

    client.on('timeout', () => {
        client.destroy();
    });

    client.connect(443, ip, () => {
        client.session = NewClientSession();

        let random_buf = NewRandomBuf();
        [client.cipher_dec_server, client.cipher_enc_server] = InitCrypto(random_buf, false);

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
            client.client_socket.write(enc_packet, () => {});
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
    console.log('Connections per second:', Math.ceil((con_count[0] + con_count[1] + con_count[2] + con_count[3] + con_count[4]) / REPORT_CON_SEC), 'DC1:', Math.ceil(con_count[0] / REPORT_CON_SEC), 'DC2:', Math.ceil(con_count[1] / REPORT_CON_SEC), 'DC3:', Math.ceil(con_count[2] / REPORT_CON_SEC), 'DC4:', Math.ceil(con_count[3] / REPORT_CON_SEC), 'DC5:', Math.ceil(con_count[4] / REPORT_CON_SEC));
    let n = 0;
    for (let i = 0; i < telegram_servers.length; i++) {
        n = Math.ceil(con_count[i] / REPORT_CON_SEC);
        telegram_idle_num[i] = (n >= 4) ? n : 4;
        con_count[i] = 0;
    }
}, REPORT_CON_SEC * 1000);


setInterval(() => {
    let server_count = telegram_servers.length;
    for (var i = 0; i < server_count; i++) {
        if (server_idle_cons[i].length < telegram_idle_num[i]) {
            create_idle_server(i, telegram_servers[i]);
        }
    }
}, 20);


net.createServer(function(socket) {

    socket.setTimeout(CON_TIMEOUT);

    socket.on('error', (err) => {
        socket.destroy();
    });

    socket.on('timeout', () => {
        socket.destroy();
    });

    socket.on('end', function() {
        if (socket.server_socket != null) {
            socket.server_socket.destroy();
        }
    });

    socket.on('data', function(data) {

        if (socket.init == null && (data.length == 41 || data.length == 56)) {
            let client_ip = socket.remoteAddress.substr(7, socket.remoteAddress.length);
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

            [socket.cipher_dec_client, socket.cipher_enc_client] = InitCrypto(buf64, true);

            let dec_auth_packet = socket.cipher_dec_client.update(buf64);
            socket.dcId = Math.abs(dec_auth_packet.readInt16LE(60)) - 1;

            for (var i = 0; i < 4; i++) {
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

        let payload = socket.cipher_dec_client.update(data);

        if (socket.server_socket == null) {
            if (server_idle_cons[socket.dcId].length > 0) {

                do {
                    socket.server_socket = server_idle_cons[socket.dcId].shift();
                    if (!socket.server_socket.writable) {
                        socket.server_socket.destroy();
                    }
                } while (!socket.server_socket.writable);

                con_count[socket.dcId]++;
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
            socket.server_socket.write(enc_payload, () => {});
        } else {
            socket.server_socket.destroy();
            socket.destroy();
        }
    });

}).listen(configObj.port);
