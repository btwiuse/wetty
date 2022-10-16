self.addEventListener("fetch", function () {
  console.log("fetch");
  return;
});
self.addEventListener("activate", function () {
  console.log("activate");
  return;
});
self.addEventListener("install", function () {
  console.log("install");
  return;
});
