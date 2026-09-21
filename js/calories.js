const ACTIVITY_METS={running:{light:7,moderate:9.8,intense:12.3},walking:{light:2.8,moderate:4.3,intense:6},cycling:{light:4,moderate:7.5,intense:10},hiking:{light:4.5,moderate:6,intense:8},swimming:{light:5,moderate:7,intense:9.8},rowing:{light:4.8,moderate:7,intense:9},strength:{light:3.5,moderate:5.5,intense:7.5},other:{light:3,moderate:5,intense:7}};

function calorieProfile(){
  const profile=data?.settings?.calorieProfile||{},latest=[...(data?.bodyData||[])].reverse().find(item=>item.metric==='weight');
  return {weight:Math.max(25,Number(profile.weight)||Number(latest?.value)||70),height:Math.max(120,Number(profile.height)||175),age:Math.max(13,Number(profile.age)||30),sex:['male','female'].includes(profile.sex)?profile.sex:'neutral'};
}
function restingCaloriesPerDay(profile=calorieProfile()){
  const base=10*profile.weight+6.25*profile.height-5*profile.age;
  return Math.max(900,base+(profile.sex==='male'?5:profile.sex==='female'?-161:-78));
}
function estimateCalories({activity='strength',intensity='moderate',effort,minutes=0,profile=calorieProfile()}={}){
  const levels=ACTIVITY_METS[activity]||ACTIVITY_METS.other;
  const score=Number(effort);
  const met=Number.isFinite(score)&&score>=1&&score<=10
    ? score<=5?levels.light+(levels.moderate-levels.light)*(score-1)/4:levels.moderate+(levels.intense-levels.moderate)*(score-5)/5
    :levels[intensity]||levels.moderate;
  const oneMetPerMinute=profile.age<18?profile.weight/60:restingCaloriesPerDay(profile)/1440;
  return Math.max(0,Math.round(oneMetPerMinute*met*Math.max(0,Number(minutes)||0)));
}
function distributeCalories(entries,total){
  if(!entries?.length)return entries||[];let remaining=Math.max(0,Math.round(total));
  return entries.map((entry,index)=>{const calories=index===entries.length-1?remaining:Math.round(total/entries.length);remaining-=calories;return {...entry,calories};});
}
