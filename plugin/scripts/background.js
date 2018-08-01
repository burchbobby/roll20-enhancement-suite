window.r20es = window.r20es || {};

function addCategoryElemToCanvasTokenRightClickMenu(name, actionType, callback) {
    return [
        {
            includes: "/editor/",
            find: "<li class='head hasSub' data-action-type='addturn'>Add Turn</li>",
            patch: `<li class='head hasSub' data-action-type='addturn'>Add Turn</li>
<li class="head hasSub" data-menuname="${actionType}"> ${name} »
<ul class="submenu" id="${actionType}" data-menuname="${actionType}" style="width: auto;display: none;">

</ul>`,
        }
    ];
}


function addElemToCanvasTokenRightClickMenu(name, actionType, callback) {
    return [
        {
            includes: "/editor/",
            find: "<li class='head hasSub' data-action-type='addturn'>Add Turn</li>",
            patch: `<li class='head hasSub' data-action-type='addturn'>Add Turn</li>
<li class='head hasSub' data-action-type='${actionType}'>${name}</li>`,
        },

        {
            includes: "assets/app.js",
            find: `else if("toback"==e)`,
            patch: `else if("${actionType}"==e) window.r20es.${callback}(n), i(), d20.token_editor.removeRadialMenu();else if("toback"==e)`
        }
    ];
}

window.r20es.hooks = {
    
    expose_d20: {
        
        force: true,

        includes: "assets/app.js",
        find: "var d20=d20||{};",
        patch: "var d20=d20||{};window.d20=d20;"
    },

    dev_mode: {
        name: "Developer mode",

        includes: "/editor/startjs/",
        find: "environment: \"production\"",
        patch: "environment: \"development\"",
    },


    token_layer_drawing: {
        
        name: "Token layer drawing (GM Only)",

        inject: ["scripts/draw_current_layer.js"],

        mods: [
            {
                includes: "assets/app.js",
                find: "this.model.view.updateBackdrops(e),this.active",
                patch: "this.model.view.updateBackdrops(e), window.is_gm && window.r20es.tokenDrawBg(e, this), this.active"

            },

            {
                includes: "assets/app.js",
                find: "function setMode(e){",
                patch: "function setMode(e){if(window.r20es) window.r20es.setModePrologue(e);",
            }
        ]
    },

    seenad_override: {
        
        name: "Skip ad",

        includes: "/editor/startjs/",
        find: "d20ext.showGoogleAd();",
        patch: 'window.d20ext.seenad = !0, $("#loading-overlay").find("div").hide(), window.currentPlayer && d20.Campaign.pages.length > 0 && d20.Campaign.handlePlayerPageChanges(), void $.get("/editor/startping/true");'
    },

    character_io: {
        
        name: "Character Exporter/Importer",

        inject: ["scripts/character_io.js"],
    },

    auto_select_next_token: {
        
        name: "Select token on its turn",

        includes: "assets/app.js",
        find: "e.push(t[0]);",
        patch: "e.push(t[0]);window.r20es.selectInitiativeToken(e[0]);"
    },

    auto_focus_next_token: {
        
        name: "Move local camera to token on its turn",

        includes: "assets/app.js",
        find: "e.push(t[0]);",
        patch: "e.push(t[0]);window.r20es.moveCameraTo(e[0]);"
    },

    auto_ping_next_token: {
        
        name: "Ping tokens visible to players on their turns",

        includes: "assets/app.js",
        find: "e.push(t[0]);",
        patch: "e.push(t[0]);window.r20es.pingInitiativeToken(e[0]);"
    },

    roll_and_apply_hit_dice_5e_ogl_r20: {
        

        name: "Roll and apply hit dice (5e, official r20 sheet)",

        mods: addElemToCanvasTokenRightClickMenu("Hit Dice", "r20es-5e-ogl-hit-dice", "rollAndApplyHitDice5eOGL")
    },

    bulk_macros: {
        
        name: "Bulk macros",

        inject: ["scripts/bulk_macros.js"],
        mods: addCategoryElemToCanvasTokenRightClickMenu("Bulk Roll", "r20es-bulk-macro-menu", "handleBulkMacroMenuClick")
    },

    import_export_table: {
        
        name: "Table Import/export",
        inject: ["scripts/import_export_table.js"],

        mods: [
            { // export buttons
                includes: "/editor/",
                find: "<button class='btn btn-danger deleterollabletable'>Delete Rollable Table</button>",
                patch: `<button class='btn r20es-table-export-json'>Export</button>
<button class='btn btn-danger deleterollabletable'>Delete Rollable Table</button>`
            },

            { // add table id to popup
                includes: "assets/app.js",
                find: `this.$el.on("click",".deleterollabletable"`,
                patch: `this.el.setAttribute("r20es-table-id", this.model.get("id")),this.$el.on("click",".deleterollabletable"`,                    
            }
        ]

    }
};

browser.runtime.onConnect.addListener(port => {
    port.postMessage({hooks: window.r20es.hooks});
});

{
    let localKeys = {};

    for(let id in window.r20es.hooks) {
        if(localKeys[id] && localKeys[id].force) continue;

        localKeys[id] = true;
    }

    browser.storage.local.get(localKeys)
        .then(p => {
            for(var key in p) {
                let hook = window.r20es.hooks[key];
                if(hook) {
                    hook.enabled = p[key];
                }
            }
        });
}

browser.runtime.onMessage.addListener((msg) => {
    if(msg.background) {
        if(msg.background.type === "get_hooks") {
            browser.runtime.sendMessage(null, {
                popup: {hooks: window.r20es.hooks, type: "receive_hooks"}
            });
        }
        if(msg.background.type === "update_hook_enabled") {
            let hook = window.r20es.hooks[msg.background.hookId];
            hook.enabled = msg.background.state;

            let save = {};
            save[msg.background.hookId] = hook.enabled;
            browser.storage.local.set(save);
        }
    }
});

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

function addModToQueueIfOk(dt, mod, queue) {
    if(mod.includes && dt.url.includes(mod.includes)) {
        queue.push(mod);
    }
}

function listener(dt) {

    let hooks = [];
    for(let id in window.r20es.hooks) {
        let hook = window.r20es.hooks[id];

        if(!hook.enabled) continue;

        if(hook.mods) {
            for(let mod of hook.mods) {
                addModToQueueIfOk(dt, mod, hooks);
            }
        } else {
            addModToQueueIfOk(dt, hook, hooks);
        }
    }

    if(hooks.length <= 0) return;

    let filter = browser.webRequest.filterResponseData(dt.requestId);
    let decoder = new TextDecoder("utf-8");
    let encoder = new TextEncoder();

    let str = "";
    filter.ondata = event => {
        str += decoder.decode(event.data, {stream: true});
    };

    filter.onstop = _ => {
        for(let mod of hooks) {
            if(!mod.find || !mod.patch) continue;

            str = str.replace(new RegExp(escapeRegExp(mod.find), 'g'), mod.patch);
            console.log(`[${mod.includes}] [${mod.find}] done!`);

        }

        filter.write(encoder.encode(str));
        filter.close();
    };
}

browser.webRequest.onBeforeRequest.addListener(
    listener,
    {urls: ["*://app.roll20.net/*"]},
    ["blocking"]);

console.log("r20es Background hook script initialized");

