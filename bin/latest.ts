#!/usr/bin/env bob

import PackageJson from "../package.json";

async function latest(pkg) {
  const resp = await fetch(
    `https://registry.npmjs.org/-/package/${pkg}/dist-tags`,
  );
  const body = await resp.json();
  return body.latest;
}

pkgVersions = Object.values(polkadot).map((x) => x.packageInfo);
const PkgBlacklist = ["chalk", "node-fetch"];
pkgVersions = Object.entries(PackageJson.dependencies).filter(([k, v]) =>
  (!PkgBlacklist.includes(k)) && !v.startsWith("npm:")
).map(([k, v]) => ({ name: k, version: v }));
pkgDevVersions = Object.entries(PackageJson.devDependencies).filter(([k, v]) =>
  (!PkgBlacklist.includes(k)) && !v.startsWith("npm:")
).map(([k, v]) => ({ name: k, version: v }));

console.log(pkgVersions);
console.log(pkgDevVersions);

pkgLatests = await Promise.all(pkgVersions.map((pkg) => latest(pkg.name)));

pkgInfo = pkgVersions.map((e, i) => {
  e.latest = pkgLatests[i];
  e.uptodate = e.latest == e.version ? "🌝" : "🌚";
  return e;
});

console.table(pkgInfo);

let outdated = pkgInfo.filter((x) => x.uptodate == "🌚");

if (outdated.length == 0) {
  console.log(`All packages are up to date!`);
} else {
  console.log(`Run this command to update:`);
  console.log(
    `yarn add`,
    outdated.map((e) => `${e.name}@${e.latest}`).join(" \\\n"),
  );
}

pkgDevLatests = await Promise.all(
  pkgDevVersions.map((pkg) => latest(pkg.name)),
);

pkgDevInfo = pkgDevVersions.map((e, i) => {
  e.latest = pkgDevLatests[i];
  e.uptodate = e.latest == e.version ? "🌝" : "🌚";
  return e;
});

console.table(pkgDevInfo);

let outdatedDev = pkgDevInfo.filter((x) => x.uptodate == "🌚");

if (outdatedDev.length == 0) {
  console.log(`All packages are up to date!`);
} else {
  console.log(`Run this command to update:`);
  console.log(
    `yarn add --dev`,
    outdatedDev.map((e) => `${e.name}@${e.latest}`).join(" \\\n"),
  );
}
