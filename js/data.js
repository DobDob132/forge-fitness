const weightSteps = [4, 7, 9, 11, 13, 16, 18, 20, 22, 25];
let defaultSettings = {pause:90, customPauses:"30, 60, 90, 120", warmup:"nein", warmupType:"Rudern", keepAwake:true, vibration:true, pauseSound:false, unit:"kg", weeklyGoal:3};
let data = JSON.parse(ForgeStore.read() || "null");

const emptyWeek = () => [
    {id:"mo",name:"Montag",color:"red",focus:"Training",warm:0,ex:[]},
    {id:"di",name:"Dienstag",color:"blue",focus:"Training",warm:0,ex:[]},
    {id:"mi",name:"Mittwoch",color:"green",focus:"Training",warm:0,ex:[]},
    {id:"do",name:"Donnerstag",color:"yellow",focus:"Training",warm:0,ex:[]},
    {id:"fr",name:"Freitag",color:"red",focus:"Training",warm:0,ex:[]},
    {id:"sa",name:"Samstag",color:"blue",focus:"Training",warm:0,ex:[]},
    {id:"so",name:"Sonntag",color:"green",focus:"Regeneration",warm:0,ex:[]}
];

if(!data) { 
    data = { 
        allPlans: [{ id: "p_default", name: "Mein erster Plan", days: emptyWeek(), archived: false }],
        activePlanId: "p_default",
        logs: [], 
        settings: defaultSettings,
        xp: 0, level: 1, xpHistory: [],
        claimedMilestones: [], bodyData: [], activeWorkout: null
    }; 
    // Add default exercises for first view
    data.allPlans[0].days[0].ex = [["Bankdrücken", 3, "8-12", 20], ["Liegestütze", 3, "Max", 0]];
} else { 
    data.settings = {...defaultSettings, ...data.settings}; 
    if(!data.xp) { data.xp=0; data.level=1; data.xpHistory=[]; }
    if(!data.claimedMilestones) data.claimedMilestones=[];
    if(!data.bodyData) data.bodyData=[];
    if(!data.activeWorkout) data.activeWorkout=null;
    // Migration for bodyData if it was old format
    data.bodyData = data.bodyData.map(d => typeof d.metric === 'undefined' ? {date: d.date, metric: 'weight', value: d.weight || d.value} : d);
}

let state={day:null,exercise:0,set:0,setsDone:0,started:0,paused:false,timer:90,timerMax:90,interval:null};
let lastSetBackup=null;
let wakeLock=null;
let exChartInstance=null;
let bodyChartInstance=null;
let summaryChartInstance=null;

const MILESTONES = [
    { id: "w1", title: "Der erste Schritt", desc: "Absolviere dein erstes Training.", req: 1, type: "workouts", xp: 100 },
    { id: "w10", title: "Routinier", desc: "Absolviere 10 Trainings.", req: 10, type: "workouts", xp: 500 },
    { id: "w50", title: "Eisenfresser", desc: "Absolviere 50 Trainings.", req: 50, type: "workouts", xp: 2000 },
    { id: "w100", title: "FORGE Meister", desc: "Absolviere 100 Trainings.", req: 100, type: "workouts", xp: 5000 },
    { id: "str3", title: "Feuer gefangen", desc: "Erreiche einen 3-Tage Streak.", req: 3, type: "streak", xp: 200 },
    { id: "str14", title: "Unaufhaltsam", desc: "Erreiche einen 14-Tage Streak.", req: 14, type: "streak", xp: 1000 },
    { id: "set100", title: "Rep für Rep", desc: "Beende insgesamt 100 Sätze.", req: 100, type: "sets", xp: 300 },
    { id: "set1k", title: "Maschine", desc: "Beende insgesamt 1.000 Sätze.", req: 1000, type: "sets", xp: 2500 },
    { id: "vol10k", title: "Tonnen-Beweger", desc: "Bewege 10.000 kg insgesamt.", req: 10000, type: "volume", xp: 1000 },
    { id: "vol50k", title: "Schwerkraft besiegt", desc: "Bewege 50.000 kg insgesamt.", req: 50000, type: "volume", xp: 3000 },
    { id: "body5", title: "Daten-Analyst", desc: "Trage 5x Körperdaten ein.", req: 5, type: "body", xp: 150 }
];

let editPlanCopy = null;
let currentEditDayIndex = 0;

const comPlansData = [
    {name: "Arnold's Split", days: [{name: "Tag 1", focus: "Brust/Rücken", ex: [["Bankdrücken", 4, "8-12", 0], ["Klimmzüge", 4, "Max", 0], ["Rudern", 4, "10-12", 0]]}, {name: "Tag 2", focus: "Schultern/Arme", ex: [["Schulterdrücken", 4, "8-10", 0], ["Seitheben", 4, "12-15", 0], ["Bizeps Curls", 3, "10-12", 0]]}, {name: "Tag 3", focus: "Beine", ex: [["Kniebeugen", 4, "8-10", 0], ["Beinpresse", 4, "10-12", 0], ["Wadenheben", 4, "15", 0]]}, {name: "Tag 4", focus: "Brust/Rücken", ex: [["Schrägbank", 4, "10", 0], ["Latzug", 4, "10", 0]]}, {name: "Tag 5", focus: "Schultern/Arme", ex: [["Arnold Press", 4, "10", 0], ["Trizepsdrücken", 4, "12", 0]]}, {name: "Tag 6", focus: "Beine", ex: [["Kreuzheben", 4, "5", 0], ["Ausfallschritte", 3, "12", 0]]}, {name: "Tag 7", focus: "Pause", ex: []}]},
    {name: "Home Workout Essentials", days: [{name: "Mo", focus: "Full Body", ex: [["Liegestütze", 3, "Max", 0], ["Kniebeugen", 3, "20", 0], ["Plank", 3, "60s", 0]]}, {name: "Di", focus: "Pause", ex: []}, {name: "Mi", focus: "Full Body", ex: [["Ausfallschritte", 3, "15", 0], ["Dips (Stuhl)", 3, "12", 0], ["Sit-Ups", 3, "20", 0]]}, {name: "Do", focus: "Pause", ex: []}, {name: "Fr", focus: "Full Body", ex: [["Burpees", 3, "15", 0], ["Liegestütze", 3, "Max", 0], ["Superman", 3, "15", 0]]}, {name: "Sa", focus: "Pause", ex: []}, {name: "So", focus: "Pause", ex: []}]},
    {name: "Ruder-Cardio Hybrid", days: [{name: "Mo", focus: "Ausdauer", ex: [["Rudern (Leicht)", 1, "30min", 0]]}, {name: "Di", focus: "Kraft", ex: [["Bankdrücken", 3, "10", 0], ["Rudern (Gerät)", 3, "10", 0]]}, {name: "Mi", focus: "Intervalle", ex: [["Rudern Intervalle", 1, "20min", 0]]}, {name: "Do", focus: "Kraft", ex: [["Klimmzüge", 3, "Max", 0], ["Kniebeugen", 3, "12", 0]]}, {name: "Fr", focus: "Ausdauer Lang", ex: [["Rudern (Ausdauer)", 1, "45min", 0]]}, {name: "Sa", focus: "Pause", ex: []}, {name: "So", focus: "Pause", ex: []}]}
];
