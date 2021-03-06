"use strict";
var INFO =
["plugin", { name: "TabGroupie", version: "0.9.1",
             href: "https://github.com/eri451/TabGroupie",
             summary: "TabGroupie Plugin", xmlns: "dactyl" },
    ["author", { email: "hans.orter@gmx.de"},
        "eri!" ],
    ["license", { href: "http://opensource.org/licenses/mit-license.php" },
        "MIT" ],
    ["project", { name: "Pentadactyl",  "min-version": "1.0b7.2" }],
    ["p", {},
        "This plugin allows you to create tabgroups, rename or delete them and",
        "move the currently use tab from group to group."],

    ["item", {},
        ["tags", {}, ":tgc :tgroup-move"],
        ["spec", {}, ":tgroup-move ", ["oa", {}, "targetGroup"]],
        ["description", {},
            ["p", {},
                "Move the current tab to the specified group."],
            ["p", {},
                "A groupname, that is not listed, will be handled as a new ",
                "group with a new name assumed you confirm the prompt. ",
                "[Y/n/b] for yes(default), no and background."]]],

    ["item", {},
        ["tags", {}, ":tgd :tgroup-delete"],
        ["spec", {}, ":tgroup-delete ", ["oa", {}, "GroupName"]],
        ["description", {},
            "This is deleting the given tabgroup incl. its items."]],

    ["item", {},
        ["tags" ,{}, ":tgg :tgroup-get"],
        ["spec", {}, ":tgroup-get ", ["oa", {}, "TabIndex"]],
        ["description", {},
            "This moves a tab to the current group."]],

    ["item", {},
       ["tags" ,{}, ":tgn :tgroup-new"],
       ["spec", {}, ":tgroup-new ", ["oa", {}, "newGroupname"]],
       ["description", {},
            "Create a new tabgroup."]],

    ["item", {},
        ["tags", {}, ":tgs :tgroup-switch"],
        ["spec", {}, ":tgroup-switch ", ["oa", {}, "targetGroup"]],
        ["description", {},
            ["p", {},
                "switch to last viewed tab of a specified group."],
            ["p", {},
                "If there is no targetGroup supplied, cycle to the next group."]]],

    ["item", {},
        ["tags", {}, ":tgt :tgroup-title"],
        ["spec", {}, ":tgroup-title ", ["oa", {}, "newName"]],
        ["description", {},
            "Sets a new title to the currently used group."]]],
    
    ["item", {},
        ["tags", {}, ":tgl :tgroup-list"],
        ["spec", {}, ":tgroup-title ", ["oa", {}, "filter"]],
        ["description", {},
            "Lists all tabgroups matching the filter."]]];


let TabGroupie = {
    init: function init(){  // gets called to refresh the list too
        let tabGroups = this.TabGroups = new Array();
        tabs.getGroups( function ({ GroupItems }) {
            let items = GroupItems.groupItems;
            for(let x = 0; x < items.length; x+=1) {
                let id = items[x].id;
                let title = items[x].getTitle();
                tabGroups.push({
                    "id":    id,
                    "title": (title === "") ? "" + id : title,
                });
            }
        });
    },


    getIdByTitle: function getIdByTitle(pattern){
        for (let i = 0; i < this.TabGroups.length; i+=1){
            if (this.TabGroups[i].title === pattern)
                return this.TabGroups[i].id;
        }

        commandline.input("Group does not exist. Create? [Y/n/b] ", check, {argCount: "1"});

        function check(args){
            if ( args.length === 0
                || "" + args[0] === "y"
                || "" + args[0] === "Y"
                || "" + args[0] === "b" ) {
                TabGroupie.newTabGroup(pattern, window.gBrowser.selectedTab, function () {
                    if ("" + args[0] !== "b")
                        tabs.selectAlternateTab();
                });
            }
            return null;
        }
    },


    changeGroup: function changeGroup(TargetGroupTitle){
        let activeTab = window.gBrowser.selectedTab;
        let targetGroupId = this.getIdByTitle(TargetGroupTitle);

        if (targetGroupId != null){
            TabView.moveTabTo(activeTab, targetGroupId);
            TabView.hide();
            tabs.selectAlternateTab();
        }
    },


    changeTitle: function changeTitle(newTitle){
        tabs.getGroups( function ({ GroupItems }) {
            let activeGroup = GroupItems.getActiveGroupItem();
            activeGroup.setTitle(newTitle);
        });
    },


    newTabGroup: function newTabGroup(title, tab, callback){
        this.createGroup(title, function ({ id }) {
            tab = tab || window.gBrowser.addTab(prefs.get("browser.startup.homepage"));
            TabView.moveTabTo(tab, id);
            TabView.hide();
            if (callback) callback(tab);
        });

    },


    createGroup: function createGroup(title, callback){
        tabs.getGroups( function ({ GroupItems }) {
            let newGroup = GroupItems.newGroup();
            newGroup.setTitle(title);
            if (callback) callback(newGroup);
        });
    },


    deleter: function deleter(title){
        tabs.getGroups( function ({ GroupItems }) {
            let items = GroupItems.groupItems;
            for (let i = 0; i < items.length; i+=1) {
                let item = items[i];
                if (item.id === TabGroupie.getIdByTitle(title)){
                    item.closeAll();
                    break;
                }
            }
        });
    },

    switchto: function switchto(title){
        if (title){
            tabs.getGroups( function ({ GroupItems }) {
                let items = GroupItems.groupItems;
                for (let i = 0; i < items.length; i+=1) {
                    let item = items[i];
                    if (item.id === TabGroupie.getIdByTitle(title)){
//                        commandline.echo(item.id);
                        let activeTab = item.getActiveTab();
                        let index = tabs.allTabs.indexOf(activeTab.tab);
                        config.tabbrowser.mTabContainer.selectedIndex = index;
                        break;
                    }
                }
            });
        }else{
//            commandline.echo("yep your are in the else");
            tabs.getGroups( function ({ GroupItems }) {
                let curGroup = GroupItems.getActiveGroupItem();
//                commandline.echo(curGroup.id);
                let nextGroup = getNext(curGroup.id);

                let activeTab = nextGroup.getActiveTab();
                let index = tabs.allTabs.indexOf(activeTab.tab);
                config.tabbrowser.mTabContainer.selectedIndex = index;

                function getNext(curid) {
                    for (let i = 0; i < TabGroupie.TabGroups.length; i+=1){
                        if (TabGroupie.TabGroups[i].id === curid) {
                            let nextIdx = (i + 1) % TabGroupie.TabGroups.length;
                            let nextGroup = GroupItems.groupItem(TabGroupie.TabGroups[nextIdx].id);
                            return nextGroup;
                        }
                    }
                }
            });
        }
    },

    getTab: function getTab(index){
        tabs.getGroups( function ({ GroupItems }) {
            let activeGroup = GroupItems.getActiveGroupItem();
            let tab = tabs.getTab(index - 1,false);  // cause we count from 0

            TabView.moveTabTo(tab, activeGroup.id);
            let tabIndex = tabs.allTabs.indexOf(tab);
            config.tabbrowser.mTabContainer.selectedIndex = tabIndex;
        });
    },

    listGroups: function listGroups(filter){
        completion.listCompleter("tabGroup", filter); 
        // FIXME: listed in wrong order
    },
    
}

try{
    TabGroupie.init();
}
catch (err){
    dactyl.echoerr("Tabgroupie.init() failed");
}

group.commands.add(["tgroup-mo[ve]", "tgm"],
                    "Change current tab to another group.",
                    function (args){
                        TabGroupie.changeGroup("" + args[0]);
                        TabGroupie.init();
                    },
                    {
                        argCount: "1",
                        completer: function (context) {   //thanks to Kris Maglione
                            context.keys = { text: "title", description: "id"};
                            context.completions = TabGroupie.TabGroups;
                        }
                    });

group.commands.add(["tgroup-t[itle]", "tgt"],
                    "Change the title of the current group",
                    function (args){
                        TabGroupie.changeTitle("" + args[0]);
                        TabGroupie.init();
                    },
                    {
                        argCount: "1",
                    });

group.commands.add(["tgroup-n[ew]", "tgn"],
                    "add a new tabgroup",
                    function (args){
                        TabGroupie.newTabGroup( "" + args[0], null, function (tab) {
                            window.gBrowser.selectedTab = tab;
                        });
                        TabGroupie.init();
                    },
                    {
                        argCount: "1",
                    });

group.commands.add(["tgroup-d[elete]", "tgd"],
                    "delete a tabgroup incl. its items",
                    function (args) {
                        TabGroupie.deleter("" + args[0]);
                        TabGroupie.init();
                    },
                    {
                        argCount: "1",
                        completer: function (context) {   //thanks to Kris Maglione
                            context.keys = { text: "title", description: "id" };
                            context.completions = TabGroupie.TabGroups;
                        }
                    });

group.commands.add(["tgroup-s[witch]", "tgs"],
                    "switch to last viewed tab of a specified group",
                    function (args){
                        if (args[0] != undefined){
//                            commandline.echo("arg:" +  args[0]);
                            TabGroupie.switchto("" + args[0]);
                        }else{
                            TabGroupie.switchto();          // cycle to next Group
                        }
                        TabGroupie.init();
                    },
                    {
                        argCount: "?",
                        completer: function (context) {   //thanks to Kris Maglione
                            context.keys = { text: "title", description: "id" };
                            context.completions = TabGroupie.TabGroups;
                        }
                    });

group.commands.add(["tgroup-g[et]", "tgg"], //note, only takes the index of the tab
                    "get a tab to the current group",
                    function (args){
                        TabGroupie.getTab(args[0]);
                        TabGroupie.init();
                    },
                    {
                        argCount: "1",
                        completer: function (context) {
                            completion.buffer(context);
                        }
                    });

group.commands.add(["tgroup-l[ist]", "tgl"],
                    "list all tabgroups",
                    function (args){
                        TabGroupie.listGroups(args[0] || "");
                    },
                    {
                        argCount: "?",
                    });
