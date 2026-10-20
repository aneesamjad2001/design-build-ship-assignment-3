/**
 * Beginner how-to text for the 25 exercises in the Ironlog library.
 *
 * Everything below is written in our own words; nothing is copied. Technique
 * cues were cross-checked (October 2026) against these pages, and where sources
 * disagreed the most conservative, beginner-safe cue was used:
 *
 *  1. ACE Exercise Library, seated lat pulldown (thigh pad, lean back no more
 *     than about 30 degrees, bar to the chest)
 *     https://www.acefitness.org/resources/everyone/exercise-library/158/seated-lat-pulldown/
 *  2. ACE Exercise Library, seated leg press (knees about 90 degrees, no lockout)
 *     https://www.acefitness.org/resources/everyone/exercise-library/154/seated-leg-press/
 *  3. ACE Exercise Library, incline chest press with dumbbells (shoulder blades,
 *     elbows under wrists, spotter)
 *     https://www.acefitness.org/resources/everyone/exercise-library/25/incline-chest-press/
 *  4. NASM Exercise Library, push-up (elbows about 45 degrees, hips not sagging)
 *     https://www.nasm.org/resource-center/exercise-library/push-up
 *  5. Harvard Health, "Resistance training by the numbers" (first weight: 10 reps
 *     with one or two left in reserve)
 *     https://www.health.harvard.edu/healthy-aging-and-longevity/resistance-training-by-the-numbers
 *  6. Harvard Health, "Straight talk on planking" (holds of 10 to 30 seconds,
 *     several short sets)
 *     https://www.health.harvard.edu/blog/straight-talk-on-planking-2019111318304
 *
 * Other entries in the ACE and NASM libraries, plus Harvard Health, Cleveland
 * Clinic, HSS and CDC (talk test) pages, were read for the remaining exercises.
 * ExRx.net and Mayo Clinic pages could not be fetched, so they are not listed.
 *
 * Where sources disagreed:
 *  - Incline bench angle: ACE says 45 to 60 degrees and NASM 45; we say 30 to 45
 *    (a gentler slope is easier on the shoulders).
 *  - Squat depth: ACE says hips below knees; we say as deep as heels stay flat.
 *  - Face pull pulley height: ACE says shoulder height, NASM eye height; we say
 *    about face height.
 *  - Leg extension: ACE warns the machine loads the knee; we keep it with a light
 *    start, no hard lockout and "stop on sharp pain" advice.
 */

export interface ExerciseText {
  /** What this exercise is for, in plain language (14 words or fewer). */
  summary: string;
  /** What to look for in the gym. */
  equipment: string;
  /** 2-3 short steps to get in position (imperative voice). */
  setup: string[];
  /** Exactly 3 short technique cues for while you are doing it. */
  cues: string[];
  /** The single most common beginner mistake, and how to fix it (1-2 sentences). */
  mistake: string;
  /** How to pick a first weight, or how long to hold / how to pace (1-2 sentences). */
  startTip: string;
  /** Only where it truly matters; one practical sentence. */
  safety?: string;
}

export const EXERCISE_NAMES: Record<string, string> = {
  "goblet-squat": "Goblet squat",
  "leg-press": "Leg press",
  "romanian-deadlift": "Romanian deadlift",
  "hip-thrust": "Hip thrust",
  "split-squat": "Split squat",
  "leg-curl": "Leg curl",
  "leg-extension": "Leg extension",
  "calf-raise": "Calf raise",
  "dumbbell-bench-press": "Dumbbell bench press",
  "incline-dumbbell-press": "Incline dumbbell press",
  "push-up": "Push-up",
  "dumbbell-shoulder-press": "Dumbbell shoulder press",
  "lateral-raise": "Lateral raise",
  "triceps-pushdown": "Triceps pushdown",
  "lat-pulldown": "Lat pulldown",
  "seated-cable-row": "Seated cable row",
  "one-arm-dumbbell-row": "One-arm dumbbell row",
  "face-pull": "Face pull",
  "dumbbell-curl": "Dumbbell curl",
  "hammer-curl": "Hammer curl",
  "plank": "Plank",
  "dead-bug": "Dead bug",
  "hanging-knee-raise": "Hanging knee raise",
  "cable-crunch": "Cable crunch",
  "incline-walk": "Incline walk",
};

export const EXERCISE_TEXT: Record<string, ExerciseText> = {
  "goblet-squat": {
    summary: "A beginner-friendly squat that works your legs and teaches good form.",
    equipment: "One dumbbell (a short bar with a weight on each end)",
    setup: [
      "Stand with your feet about shoulder-width apart, toes turned out a little.",
      "Hold one dumbbell upright at your chest, cupping the top end with both hands.",
    ],
    cues: [
      "Lower slowly, as deep as you can while keeping your heels flat.",
      "Point your knees the same way as your toes.",
      "Keep your chest tall and your elbows close to your ribs.",
    ],
    mistake:
      "Folding forward so your heels lift off the floor. Hold the dumbbell snug to your chest and stop lowering where you can still stay tall.",
    startTip:
      "Start light: pick a dumbbell where you finish 10 smooth reps with 2 reps left in the tank (you could still do 2 more).",
  },

  "leg-press": {
    summary: "Works your legs by pushing a weighted platform away while you sit supported.",
    equipment: "Leg press machine (a reclined seat facing a big foot platform you push away)",
    setup: [
      "Sit with your back and head against the pad, and set the seat so your knees bend to about 90 degrees.",
      "Put your feet flat on the platform, about hip-width apart, toes pointing forward or slightly out.",
      "Hold the side handles and unlock the platform (a lever or handle by the seat, if your machine has one).",
    ],
    cues: [
      "Push through your whole foot, keeping your heels down.",
      "Stop just before your knees lock, leaving a small bend.",
      "Lower slowly, and stop before your hips start to curl up off the seat.",
    ],
    mistake:
      "Locking your knees straight at the top. Stop just short of straight so the weight stays on your muscles, not your joints.",
    startTip:
      "It's easy to load this machine too heavy, so start light. Pick a weight where you finish 10 smooth reps with 2 to 3 reps left in the tank.",
    safety: "If your machine has a lock lever, set it again before you get up so the platform can't drop.",
  },

  "romanian-deadlift": {
    summary: "Works the back of your legs by bending forward at your hips.",
    equipment: "A pair of dumbbells (a barbell also works)",
    setup: [
      "Stand with your feet hip-width apart, a dumbbell in each hand in front of your thighs.",
      "Unlock your knees with a small bend and keep that bend the whole time.",
      "Lift your chest, pull your shoulders back, and look at the floor a few steps ahead.",
    ],
    cues: [
      "Push your hips straight back, as if closing a car door with your bottom.",
      "Slide the dumbbells down your legs, keeping them close.",
      "Lower until you feel a stretch behind your thighs, then drive your hips forward to stand.",
    ],
    mistake:
      "Squatting down instead of bending at the hips. Keep your knees softly bent and send your hips back so your shins stay nearly vertical.",
    startTip:
      "Practice 10 reps with empty hands first. Then pick dumbbells where you finish 10 slow reps with 2 to 3 reps left in the tank.",
    safety: "Keep your back flat the whole time; if it starts to round, stop lowering at that point and stand up.",
  },

  "hip-thrust": {
    summary: "Works your glutes (the muscles of your bottom) by lifting your hips.",
    equipment: "A sturdy flat bench (about knee height) and one dumbbell; a folded towel for padding",
    setup: [
      "Sit on the floor with your upper back against the side of a bench, pushed against a wall so it can't slide.",
      "Rest a dumbbell across your hips, hold it with both hands, and lean back until your shoulder blades are on the bench edge.",
      "Bend your knees and place your feet flat, about hip-width apart.",
    ],
    cues: [
      "Push through your heels to lift your hips.",
      "Stop when your body makes a straight line from knees to shoulders.",
      "Keep your ribs down and your chin tucked so your back stays still.",
    ],
    mistake:
      "Lifting too high and arching your lower back. Stop when your hips line up with your shoulders and knees, squeeze your bottom for a second, then lower slowly.",
    startTip:
      "Start with just your body weight to learn the shape. Then add a dumbbell where you finish 10 reps with about 2 reps left in the tank.",
    safety: "Make sure the bench can't slide, and rest your shoulder blades, not your neck, on its edge.",
  },

  "split-squat": {
    summary: "Trains each leg on its own by lowering from a long stride.",
    equipment: "Nothing at first (body weight), then a pair of dumbbells; a wall or rack nearby for balance",
    setup: [
      "Take a long step forward, with your feet hip-width apart side to side, like train tracks.",
      "Rise onto the ball of your back foot and keep your front foot flat.",
      "Stand tall with your hands on your hips, or one hand on a wall.",
    ],
    cues: [
      "Lower straight down until your back knee hovers just above the floor.",
      "Keep your front knee pointing the same way as your toes.",
      "Keep your chest up, then push through your front foot to stand.",
    ],
    mistake:
      "Taking too short a step, which pushes your front knee far forward and tips you off balance. Step longer so your front shin stays nearly vertical.",
    startTip:
      "Start with body weight only. When that feels steady, hold light dumbbells where you finish 10 reps per leg with about 2 reps left in the tank.",
    safety: "Keep a hand on a wall or rack until the move feels steady, and keep most of your weight on your front leg.",
  },

  "leg-curl": {
    summary: "Works the back of your thighs by bending your knees against a pad.",
    equipment: "Leg curl machine (a seat, or a bench you lie face down on, with a padded bar behind your ankles)",
    setup: [
      "Sit (or lie face down) so your knees line up with the machine's pivot, the round hinge at its side.",
      "Set the pad on the back of your lower legs, just above your heels.",
      "Adjust the thigh pad, if there is one, so it holds your legs down snugly, then grip the handles.",
    ],
    cues: [
      "Curl the pad toward your bottom in one smooth motion.",
      "Keep your hips pressed down; don't arch your back to help.",
      "Lower slowly, stopping just before your legs are fully straight.",
    ],
    mistake:
      "Using too much weight, so your hips rise or your back arches to swing the pad up. Pick a lighter weight and keep your hips down.",
    startTip:
      "Start light: pick a weight where you finish 10 slow reps with 2 reps left in the tank (you could still do 2 more).",
  },

  "leg-extension": {
    summary: "Works the front of your thighs by straightening your knees against a pad.",
    equipment: "Leg extension machine (a seat with a padded bar that hooks over the front of your lower shins)",
    setup: [
      "Sit with your back flat against the pad and your knees lined up with the machine's pivot, the round hinge at its side.",
      "Set the shin pad low on your shins, just above your ankles.",
      "Hold the side handles and sit tall.",
    ],
    cues: [
      "Straighten your legs smoothly; don't kick the weight up.",
      "Stop just before your knees lock, then pause for a second.",
      "Lower slowly all the way back to the start.",
    ],
    mistake:
      "Kicking the weight up and snapping your knees straight. Use less weight and move smoothly, stopping just short of locked knees.",
    startTip:
      "Go lighter than you think: pick a weight you could lift 15 times, and stop at 12 with 3 reps left in the tank.",
    safety: "Stop if you feel sharp pain in the front of your knee.",
  },

  "calf-raise": {
    summary: "Works your calves (back of the lower leg) by rising onto your toes.",
    equipment:
      "A sturdy step or platform with a wall or rail to hold, or a standing calf raise machine (shoulder pads above a foot platform)",
    setup: [
      "Stand with the balls of your feet on the edge of a step, heels hanging off, feet hip-width apart.",
      "Hold a wall or rail lightly for balance, and stand tall with your knees straight but not locked.",
    ],
    cues: [
      "Rise as high as you can onto your toes and pause for a second.",
      "Lower slowly until you feel a stretch in your calves.",
      "Keep your feet pointing straight ahead.",
    ],
    mistake: "Bouncing through short, fast reps. Pause for a second at the top and take about two seconds to lower.",
    startTip:
      "Start with just your body weight. When you finish 15 slow reps with 3 or more reps left in the tank, hold a dumbbell next time.",
    safety: "Hold a wall or rail so a wobble can't turn into a fall.",
  },

  "dumbbell-bench-press": {
    summary: "Works your chest, shoulders and arms by pressing two dumbbells upward.",
    equipment: "A flat bench (a padded bench you lie on) and a pair of dumbbells",
    setup: [
      "Sit on the end of the bench holding the dumbbells on your thighs, then lie back slowly, bringing them to the sides of your chest.",
      "Plant your feet flat on the floor and pull your shoulder blades down and back into the bench.",
      "Press the dumbbells up over your chest, palms facing your feet, with your arms straight.",
    ],
    cues: [
      "Lower the dumbbells slowly to the sides of your chest, with your elbows angled about 45 degrees from your body.",
      "Keep your wrists straight, stacked over your elbows.",
      "Press up until your arms are straight, keeping your head, shoulders and hips on the bench.",
    ],
    mistake:
      "Flaring your elbows straight out to the sides. Angle them to about 45 degrees, like an arrow rather than a T, to go easier on your shoulders.",
    startTip:
      "Go lighter than you expect, because dumbbells wobble more than a machine. Pick a pair where you finish 10 reps with 2 to 3 reps left in the tank.",
    safety: "Ask a staff member to spot you as the weights get heavy, and never lie under weights you aren't sure you can press.",
  },

  "incline-dumbbell-press": {
    summary: "Works your upper chest by pressing dumbbells up on an angled bench.",
    equipment: "An adjustable bench (the back can be set at an angle) and a pair of dumbbells",
    setup: [
      "Set the bench back to a gentle slope, about 30 to 45 degrees (not steep).",
      "Sit with the dumbbells on your thighs, lean back, and bring them to the sides of your chest, feet flat on the floor.",
      "Pull your shoulder blades down and back into the pad.",
    ],
    cues: [
      "Lower slowly until the dumbbells are beside your upper chest, elbows about 45 degrees from your body.",
      "Keep each wrist straight, with your elbow under the dumbbell.",
      "Press up and slightly forward until your arms are straight, without locking out hard.",
    ],
    mistake:
      "Setting the bench too steep, which turns it into a shoulder press. Keep the slope gentle so your chest does more of the work.",
    startTip:
      "Use lighter dumbbells than you would on a flat bench. Pick a pair where you finish 10 reps with 2 to 3 reps left in the tank.",
    safety: "Ask for a spot as the weights get heavy, and lower the dumbbells to your thighs rather than dropping them when you finish.",
  },

  "push-up": {
    summary: "Works your chest and arms by pushing yourself up from the floor.",
    equipment: "Nothing (your body weight); a sturdy bench to rest your hands on makes it easier",
    setup: [
      "Place your hands on the floor a little wider than your shoulders, fingers pointing forward.",
      "Step your feet back until your body is one straight line from head to heels.",
      "Tighten your stomach and bottom, and look at the floor just ahead of your hands.",
    ],
    cues: [
      "Keep your body in one straight line the whole time.",
      "Lower for about two seconds, until your elbows are bent to about 90 degrees.",
      "Angle your elbows about 45 degrees from your body, like an arrow, not a T.",
    ],
    mistake:
      "Letting your hips sag or poke up. Squeeze your stomach and bottom, or make it easier by putting your hands on a bench.",
    startTip:
      "Pick a version (floor, or hands on a bench) where you finish about 8 clean reps with 2 reps left in the tank. The higher your hands, the easier it gets.",
  },

  "dumbbell-shoulder-press": {
    summary: "Works your shoulders and arms by pressing two dumbbells overhead.",
    equipment: "An adjustable bench set nearly upright, and a pair of dumbbells",
    setup: [
      "Set the bench back nearly upright and sit with your back, shoulders and bottom against it.",
      "Hold the dumbbells at shoulder height, palms facing forward, elbows slightly in front of you.",
      "Plant your feet flat and tighten your stomach.",
    ],
    cues: [
      "Press up until your arms are almost straight, without locking out hard.",
      "Keep your back against the pad; don't arch your lower back.",
      "Lower slowly to shoulder height; don't let the weights drop.",
    ],
    mistake:
      "Arching your lower back to push the weights up. Stay against the backrest, tighten your stomach, and use lighter dumbbells.",
    startTip:
      "Shoulders tire fast, so start light. Pick a pair where you finish 10 reps with 2 to 3 reps left in the tank.",
    safety: "Lower the dumbbells to your thighs before you stand up, and stop if you feel sharp pain in your shoulder.",
  },

  "lateral-raise": {
    summary: "Works the sides of your shoulders by lifting light dumbbells out wide.",
    equipment: "A pair of light dumbbells",
    setup: [
      "Stand tall with your feet hip-width apart, a light dumbbell in each hand at your sides.",
      "Bend your elbows slightly and keep that bend the whole time.",
    ],
    cues: [
      "Lead with your elbows, lifting the dumbbells out to your sides.",
      "Stop when your arms are about level with your shoulders.",
      "Lower slowly, taking about twice as long as the lift.",
    ],
    mistake:
      "Using weights that are too heavy, so you swing your body and shrug. Switch to lighter dumbbells and lift slowly.",
    startTip:
      "Start lighter than feels necessary, because the muscles involved are small. Pick a pair where you finish 12 slow reps with 2 to 3 reps left in the tank.",
    safety: "If your neck tightens up, use lighter dumbbells so your shoulders can stay relaxed.",
  },

  "triceps-pushdown": {
    summary: "Works the back of your upper arms by pushing a cable down.",
    equipment:
      "Cable machine (a tall frame with a pin-select weight stack and a pulley at the top) with a short bar or rope attached",
    setup: [
      "Stand facing the machine, feet hip-width apart, and grip the bar or rope with the pulley above your head.",
      "Tuck your elbows against your sides, bent to about 90 degrees, with your hands near chest height.",
      "Stand tall with your shoulders back and down.",
    ],
    cues: [
      "Keep your elbows glued to your sides; only your forearms move.",
      "Push down until your arms are straight, without locking out hard.",
      "Let the handle rise slowly until your elbows are bent to about 90 degrees.",
    ],
    mistake:
      "Letting your elbows drift forward or leaning over the bar to push with your body weight. Use less weight, stand tall, and keep your elbows at your sides.",
    startTip:
      "Start light, since the muscles at the back of your arms are small. Pick a weight where you finish 12 smooth reps with about 2 reps left in the tank.",
  },

  "lat-pulldown": {
    summary: "Works your upper back by pulling a long bar down to your chest.",
    equipment: "Lat pulldown machine (a seat with a thigh pad and a long bar overhead on a cable)",
    setup: [
      "Sit down and slide your thighs under the pad, adjusting it so it holds them down firmly.",
      "Grab the bar with an overhand grip (palms facing away), a little wider than your shoulders.",
      "Lean back slightly with your chest up and your arms straight overhead.",
    ],
    cues: [
      "Drive your elbows down toward your sides to pull the bar to your upper chest.",
      "Stop when the bar reaches your chest, before your elbows move behind your body.",
      "Keep your torso still and let the bar rise slowly.",
    ],
    mistake:
      "Leaning far back and swinging the weight down. Use less weight, stay nearly upright, and let your elbows lead the pull.",
    startTip:
      "Pick a weight where you finish 10 smooth reps with 2 reps left in the tank. If you have to lean back or jerk the bar down, it's too heavy.",
    safety: "Always pull the bar to the front of your chest, never behind your head.",
  },

  "seated-cable-row": {
    summary: "Works your upper back by pulling a handle toward your stomach.",
    equipment: "Seated cable row machine (a bench with footplates facing a low cable and a handle, often V-shaped)",
    setup: [
      "Sit with your feet on the footplates and your knees slightly bent, then grab the handle with both hands.",
      "Sit tall with a flat back, arms straight, and shoulders back and down.",
    ],
    cues: [
      "Pull the handle toward your lower ribs, keeping your elbows close to your sides.",
      "Squeeze your shoulder blades together for a second.",
      "Keep your chest up and your torso still; don't rock.",
    ],
    mistake:
      "Rocking back and forth to heave the weight. Use less weight, sit tall, and move only your arms and shoulders.",
    startTip:
      "Pick a weight where you finish 10 smooth reps with about 2 reps left in the tank. If your body rocks to finish a rep, go lighter.",
    safety: "Keep your back flat, and use less weight if the cable pulls you forward into a rounded slump.",
  },

  "one-arm-dumbbell-row": {
    summary: "Works your back by pulling one dumbbell toward your hip at a time.",
    equipment: "A flat bench and one dumbbell",
    setup: [
      "Put one hand and the same-side knee on the bench, with your hand under your shoulder and your knee under your hip.",
      "Hold a dumbbell in your other hand, arm hanging straight down, with your back flat like a tabletop.",
      "Look at the floor so your neck stays in line with your back.",
    ],
    cues: [
      "Pull the dumbbell toward your hip, keeping your elbow close to your side.",
      "Keep your shoulders level; don't twist to lift the weight.",
      "Lower slowly until your arm is straight.",
    ],
    mistake:
      "Twisting your body to yank the weight up. Use a lighter dumbbell and stop each pull before your shoulders start to turn.",
    startTip:
      "Pick a dumbbell where you finish 10 reps with about 2 reps left in the tank, then do the same on the other arm.",
  },

  "face-pull": {
    summary: "Works your upper back by pulling a rope toward your face.",
    equipment:
      "Cable machine (a tall frame with a pin-select weight stack and a pulley) with a rope attachment (a thick rope with a ball on each end)",
    setup: [
      "Set the pulley at about face height and clip on the rope.",
      "Take one end of the rope in each hand and step back until your arms are straight and the cable is tight.",
      "Stand tall with your feet hip-width apart, knees slightly bent, and shoulders back and down.",
    ],
    cues: [
      "Pull the rope toward your face, spreading the ends apart as you go.",
      "Drive your elbows back and out, about as high as your shoulders.",
      "Squeeze for a second, then let the rope return slowly.",
    ],
    mistake:
      "Using too much weight, then leaning back and tugging with your arms. Go much lighter, stand tall, and lead with your elbows.",
    startTip:
      "Face pulls are a light exercise: pick a weight where you finish 12 to 15 slow reps with about 3 reps left in the tank.",
  },

  "dumbbell-curl": {
    summary: "Works the front of your upper arms by curling dumbbells toward your shoulders.",
    equipment: "A pair of dumbbells",
    setup: [
      "Stand tall with your feet hip-width apart, a dumbbell in each hand at your sides, palms facing forward.",
      "Tuck your elbows against your sides and keep your shoulders down.",
    ],
    cues: [
      "Keep your elbows by your sides; only your forearms move.",
      "Curl until the dumbbells are near your shoulders, without shrugging.",
      "Lower slowly, taking about twice as long as the lift.",
    ],
    mistake:
      "Swinging your body to lift the weights. Use lighter dumbbells, or stand with your back against a wall so you can't swing.",
    startTip:
      "Pick a pair where you finish 10 smooth reps with about 2 reps left in the tank. If you have to swing to finish, they're too heavy.",
  },

  "hammer-curl": {
    summary: "Works your arms by curling dumbbells with your palms facing each other.",
    equipment: "A pair of dumbbells",
    setup: [
      "Stand tall with your feet hip-width apart, a dumbbell in each hand at your sides, palms facing your thighs.",
      "Tuck your elbows against your sides and keep your shoulders down.",
    ],
    cues: [
      "Keep your elbows at your sides; don't let them drift forward.",
      "Keep your wrists straight with your thumbs pointing up, like holding a hammer.",
      "Lower slowly until your arms are straight, keeping your shoulders down.",
    ],
    mistake:
      "Rocking your body and shrugging to get the weights up. Choose lighter dumbbells and keep your upper body still.",
    startTip:
      "Pick a pair where you finish 10 smooth reps with about 2 reps left in the tank. If you swing to finish, they're too heavy.",
  },

  "plank": {
    summary: "Works your core (the muscles around your middle) by holding a straight line.",
    equipment: "A mat or folded towel to cushion your forearms",
    setup: [
      "Lie face down with your forearms on the floor and your elbows directly under your shoulders.",
      "Tuck your toes, press into your forearms, and lift into one straight line from head to heels.",
      "Squeeze your stomach and bottom, and look at the floor just past your hands.",
    ],
    cues: [
      "Keep a straight line from head to heels, hips neither sagging nor poking up.",
      "Keep squeezing your stomach and bottom the whole time.",
      "Breathe slowly and steadily; don't hold your breath.",
    ],
    mistake:
      "Holding on while your hips sag or poke up. End the hold as soon as your form slips, rest, then start another short one.",
    startTip:
      "This one is timed: hold for the time shown, resting between holds. If your hips start to sag sooner, stop there (even 10 seconds counts) and add a few seconds each visit.",
    safety: "Stop if you feel sharp pain in your lower back.",
  },

  "dead-bug": {
    summary: "Trains your stomach muscles to keep your back still as you move.",
    equipment: "A mat or soft floor",
    setup: [
      "Lie on your back with your arms straight up toward the ceiling.",
      "Lift your legs so your knees are bent at 90 degrees, directly over your hips.",
      "Gently press your lower back into the floor and keep it there.",
    ],
    cues: [
      "Slowly lower one heel toward the floor and reach the opposite arm back overhead, stopping just short of touching down.",
      "If your lower back lifts off the floor, shorten the movement.",
      "Breathe steadily, and switch sides with control.",
    ],
    mistake:
      "Letting your lower back arch off the floor as your arm and leg reach out. Move through a smaller range, or move only your legs, until your back stays flat.",
    startTip:
      "Count reps per side: start with 6 slow reps on each side, stopping with 2 reps left in the tank or as soon as your lower back lifts.",
  },

  "hanging-knee-raise": {
    summary: "Works your stomach muscles by lifting your knees while hanging from a bar.",
    equipment:
      "A pull-up bar (a high bar you can hang from) with a box to step on, or a captain's chair (a frame with forearm pads and a back pad) as an easier option",
    setup: [
      "Grip the bar overhand (palms facing away), hands shoulder-width apart, and hang with your feet off the floor.",
      "Pull your shoulders down away from your ears and tighten your stomach.",
      "On a captain's chair, rest your forearms on the pads and press your back against the backrest instead.",
    ],
    cues: [
      "Raise your knees toward your chest slowly, without swinging.",
      "Pause for a moment at the top.",
      "Lower your legs slowly, taking about three seconds.",
    ],
    mistake:
      "Swinging your legs to build momentum. Let your body stop moving between reps, then lift smoothly using your stomach muscles.",
    startTip:
      "Start with 5 to 8 slow reps, stopping with 2 reps left in the tank or as soon as you start to swing. If your grip gives out first, use the captain's chair.",
    safety: "When your grip starts to slip, step down to the floor or a box rather than letting go and dropping.",
  },

  "cable-crunch": {
    summary: "Works your stomach muscles by curling your upper body down against a cable.",
    equipment:
      "Cable machine (a tall frame with a pin-select weight stack and a pulley at the top) with a rope attachment, plus a mat for your knees",
    setup: [
      "Clip the rope to the high pulley and kneel facing the machine, hips over your knees.",
      "Hold the rope ends beside your ears, with your elbows tucked in.",
      "Sit tall and tighten your stomach before you start.",
    ],
    cues: [
      "Curl your chest down toward your hips, rounding your upper body.",
      "Keep your hips still; don't sit back toward your heels.",
      "Keep your hands by your ears so your stomach, not your arms, does the pulling.",
    ],
    mistake:
      "Sitting your hips back toward your heels instead of curling down, which turns it into an arm pull. Keep your hips still and bring your ribs toward your hips.",
    startTip:
      "Start lighter than you expect: pick a weight where you finish 12 slow reps with about 3 reps left in the tank. If you feel it mostly in your arms or lower back, drop the weight.",
  },

  "incline-walk": {
    summary: "Steady uphill walking on a treadmill that gets your heart and legs working.",
    equipment:
      "Treadmill (a moving belt you walk on) with an incline button or lever, often marked with an up arrow; the display shows percent or level",
    setup: [
      "Stand with your feet on the side rails, start the belt at a slow speed, then step onto it.",
      "Begin with no incline (or 1 percent) and walk for 2 to 3 minutes to warm up.",
      "Raise the incline a little at a time, starting with 1 to 3 percent.",
    ],
    cues: [
      "Stand tall and look ahead, not down at your feet.",
      "Swing your arms naturally; touch the rails only lightly for balance.",
      "Keep a pace where you can talk in full sentences; if you're gasping, slow down or lower the incline.",
    ],
    mistake:
      "Setting the incline too steep and gripping the handrails. If you need the rails to keep up, lower the incline or slow down.",
    startTip:
      "This one is timed: start with 10 minutes in total, including the warm-up, and add 2 to 3 minutes each visit until you reach 20 to 30 minutes.",
    safety: "Clip the machine's safety cord to your clothing so the belt stops if you slip.",
  },
};
