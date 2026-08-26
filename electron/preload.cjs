"use strict";

const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("cosHarness", {
  isDesktop: true,
});
