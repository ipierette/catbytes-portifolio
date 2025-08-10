
const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const argv = require("minimist")(process.argv.slice(2));

const file = argv.file || "index.html";
const site = (argv.site || "https://catbytes.netlify.app").replace(/\/+$/,"");
const image = argv.image || "/preview-final.png";
const theme = argv.theme || "#0f172a";
const dry = !!argv.dry;

const TITLE_FULL = argv.titleFull || "CatBytes — Portfólio Criativo de Front-end, Automação e IA";
const DESC_FULL  = argv.descFull  || "Conheça projetos que unem design moderno, código limpo e soluções com inteligência artificial e automação. Explore, inspire-se e veja o futuro em bytes.";

const TITLE_SHORT = argv.titleShort || "CatBytes — Criatividade, Código e IA";
const DESC_SHORT  = argv.descShort  || "Portfólio com projetos modernos, automação e IA. Explore agora!";

function absUrl(url) {
  if (/^https?:\/\//i.test(url)) return url;
  return site + (url.startsWith("/") ? url : `/${url}`);
}

function upsert($, selector, createTag, attrs) {
  let el = $(selector).first();
  if (el.length === 0) {
    el = $(createTag);
    $("head").append(el);
  }
  Object.entries(attrs).forEach(([k, v]) => el.attr(k, v));
  return el;
}

function run() {
  if (!fs.existsSync(file)) {
    console.error(`Arquivo não encontrado: ${file}`);
    process.exit(1);
  }
  const html = fs.readFileSync(file, "utf8");
  const $ = cheerio.load(html, { decodeEntities: false });

  if ($("head").length === 0) $("html").prepend("<head></head>");

  if ($('meta[charset]').length === 0) $("head").prepend('<meta charset="UTF-8">');
  if ($('meta[name="viewport"]').length === 0)
    $("head").prepend('<meta name="viewport" content="width=device-width, initial-scale=1.0">');

  if ($("title").length > 1) $("title").not(":first").remove();
  if ($("title").length === 0) $("head").prepend("<title></title>");
  $("title").text(TITLE_FULL);

  upsert($, 'meta[name="description"]', "<meta>", {
    name: "description",
    content: DESC_FULL
  });

  upsert($, 'link[rel="canonical"]', "<link>", {
    rel: "canonical",
    href: site + "/"
  });

  upsert($, 'meta[property="og:type"]', "<meta>", { property: "og:type", content: "website" });
  upsert($, 'meta[property="og:site_name"]', "<meta>", { property: "og:site_name", content: "CatBytes" });
  upsert($, 'meta[property="og:url"]', "<meta>", { property: "og:url", content: site + "/" });
  upsert($, 'meta[property="og:title"]', "<meta>", { property: "og:title", content: TITLE_FULL });
  upsert($, 'meta[property="og:description"]', "<meta>", { property: "og:description", content: DESC_FULL });
  upsert($, 'meta[property="og:image"]', "<meta>", { property: "og:image", content: absUrl(image) });
  upsert($, 'meta[property="og:image:width"]', "<meta>", { property: "og:image:width", content: "1200" });
  upsert($, 'meta[property="og:image:height"]', "<meta>", { property: "og:image:height", content: "630" });
  upsert($, 'meta[name="twitter:card"]', "<meta>", { name: "twitter:card", content: "summary_large_image" });
  upsert($, 'meta[name="twitter:title"]', "<meta>", { name: "twitter:title", content: TITLE_SHORT });
  upsert($, 'meta[name="twitter:description"]', "<meta>", { name: "twitter:description", content: DESC_SHORT });
  upsert($, 'meta[name="twitter:image"]', "<meta>", { name: "twitter:image", content: absUrl(image) });
  upsert($, 'meta[name="theme-color"]', "<meta>", { name: "theme-color", content: theme });

  const backup = path.join(path.dirname(file), path.basename(file) + ".meta.backup.html");
  if (!dry) {
    fs.writeFileSync(backup, html, "utf8");
    fs.writeFileSync(file, $.html(), "utf8");
  }

  console.log(`✔ Metas aplicadas em ${file}`);
  console.log(`   • Título (full): ${TITLE_FULL}`);
  console.log(`   • Título (short/Twitter): ${TITLE_SHORT}`);
  console.log(`   • Imagem: ${absUrl(image)}`);
  if (!dry) console.log(`   • Backup: ${backup}`);
  else console.log("   • Dry-run: nenhuma alteração gravada.");
}

run();
