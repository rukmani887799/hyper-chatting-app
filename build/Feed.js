"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const getPort = require('get-port');
const hypercore = require('hypercore');
const discovery = require('hyperdiscovery');
const ram = require('random-access-memory');
const nanobus = require('nanobus');
const debug = true;
class Feed {
    constructor(otherKey, persist = false) {
        this.events = nanobus();
        if (debug) {
            this.events.on('*', (name, data) => console.log(name, data));
        }
        this.feed = hypercore((file) => ram(), otherKey, { valueEncoding: 'json' });
        this.feed.ready(async (err) => {
            if (err)
                throw err;
            this.key = this.feed.key.toString('hex');
            const swarm = discovery(this.feed, {
                port: await getPort(),
            });
            swarm.on('connect', (peer, id) => {
                this.events.emit('peer/connect', swarm.peers.length);
            });
            swarm.on('disconnect', (peer, id) => {
                this.events.emit('peer/disconnect', swarm.peers.length);
            });
            this.events.on('close', () => {
                swarm.close(swarmErr => {
                    this.feed.close(feedErr => {
                        this.events.emit('closed', swarmErr || feedErr);
                    });
                });
            });
            this.events.emit('ready', this.key);
            if (this.feed.writable) {
                this.events.on('write', (event) => {
                    this.feed.append(event, err => {
                        if (err)
                            console.error(err);
                    });
                });
            }
            this.feed.createReadStream({ live: true }).on('data', (event) => {
                this.events.emit('read', event);
            });
        });
    }
    onReady(listener) {
        this.feed.ready(() => listener(this.feed.key));
    }
    onPeerConnect(listener) {
        this.events.on('peer/connect', listener);
    }
    onPeerDisconnect(listener) {
        this.events.on('peer/disconnect', listener);
    }
    onRead(listener) {
        this.events.on('read', (event) => {
            listener({
                author: this.key,
                content: event,
            });
        });
    }
    writeMessage(text) {
        this.events.emit('write', event('message', text));
    }
    follow(key) {
        this.events.emit('write', event('follow', key));
    }
    close() {
        this.events.emit('close');
    }
    onceClosed(listener) {
        this.events.once('closed', listener);
    }
}
exports.default = Feed;
function event(type, payload) {
    return {
        type,
        payload,
        ts: +Date.now()
    };
}
