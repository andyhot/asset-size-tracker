"use strict";

const fs = require('fs');
const prettyjson = require('prettyjson');
const cheerio = require('cheerio');
const low = require('lowdb');

const jsStorage = {
    read(source) {
    },
    write(dest, obj) {
        const data = JSON.stringify(obj, null, 2);
        fs.writeFileSync(dest, 'window._sizeData = ' + data);
    }
};

const base_folder = process.argv[2] || 'work';
const index_html = [];

const ignore_scripts = /.*tracker\.js/;
const ignore_remote = /^http|^\/\//;

const map_url_path = [{
    from: 'https://d26gcd16fgpb1d.cloudfront.net/',
    to: ''
}];

const data = [];

const withAttribute = ($, selector, attr) => {
    const hits = [];
    $(selector).each((i, elem) => {
        let src = $(elem).attr(attr);
        if (src) {
            hits.push(src);
        }
    });
    return hits;
};

const excludeIgnored = (item) => !item.match(ignore_scripts);
const excludeRemote = (item) => !item.match(ignore_remote);

const normalizePath = (item) => {
    map_url_path.forEach((replaceData) => {
        item = item.replace(replaceData.from, replaceData.to);
    });
    return item;
};

const addSize = (item) => {
    const fileStat = fs.statSync(`${base_folder}/${item}`);
    return {
        id: item,
        size: fileStat.size
    };
};

const sumSize = (items) => {
    return items.reduce((sum, item) => sum + item.size, 0);
};

fs.readdirSync(base_folder).forEach(file => {
    if (file.match(/index\..+\.html/)) {
        index_html.push(file);
    }
});

index_html.forEach(file => {
    const filePath = `${base_folder}/${file}`;
    const stat = fs.statSync(filePath);
    const html = fs.readFileSync(filePath, {
        encoding: 'utf8'
    });
    const $ = cheerio.load(html);

    const scripts = withAttribute($, 'script', 'src')
        .filter(excludeIgnored).map(normalizePath).filter(excludeRemote).map(addSize);

    const styles = withAttribute($, 'link[rel=stylesheet]', 'href')
        .map(normalizePath).filter(excludeRemote).map(addSize);

    data.push({
        id: file,
        //created: stat.ctime,
        created_ts: stat.ctime.getTime(),
        scripts, styles,
        scripts_size: sumSize(scripts),
        styles_size: sumSize(styles)
    });
});

console.log(prettyjson.render(data));

const db = low('db.js', { storage: jsStorage });
db.setState(data);
