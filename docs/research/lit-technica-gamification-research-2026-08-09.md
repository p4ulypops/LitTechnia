# Gamification Mechanics in Writing, Habit, and Language-Learning Apps
### A source-grounded research report for Lit Technica's "progress without shame" design principles

**Prepared:** 9 August 2026
**Scope:** Eight required cases (Habitica, 4 The Words, Written? Kitten!, NaNoWriMo, Duolingo, Forest, gamification research, Scrivener), each with (1) what the tool is, (2) concrete mechanics, (3) documented reaction/criticism/design rationale, (4) exact URLs fetched. Ends with synthesized design principles and a full URL list.

**Grounding note:** Every value below comes from a page fetched during this research session. Where a primary source was blocked by robots rules or returned an error, that is stated explicitly and a credible secondary source is used instead, flagged as such. Values that could not be confirmed from a fetched page are marked `n.a.`

---

## 1. Habitica — RPG habit tracker with HP loss

### What it is
Habitica is a habit-tracking and to-do application structured as a retro RPG: the user has an avatar with Health, Experience, Levels, Gold and equipment, and real-life tasks drive the game state ([Habitica FAQ](https://habitica.com/static/faq)).

### Concrete mechanics

| Mechanic | Concrete detail | Source |
|---|---|---|
| Task types | **Habits** (can be positive, negative or both), **Dailies** (recurring, scheduled), **To Do's** (one-off) | [Habitica FAQ](https://habitica.com/static/faq) |
| Reward | Clicking a positive Habit or completing a Daily/To Do awards **Gold and Experience** | [Habitica FAQ](https://habitica.com/static/faq) |
| Penalty | Clicking a negative Habit costs **Health (HP)**; **missing a Daily costs HP at Cron** (the daily rollover). To Do's carry **no HP loss** for being late | [Habitica FAQ](https://habitica.com/static/faq) |
| Difficulty colour-coding | Tasks shift colour from **yellow → blue → red**; the redder a task, the more Gold and Experience it yields — an explicit nudge to attempt harder tasks | [Habitica FAQ](https://habitica.com/static/faq) |
| Levelling | **1 stat point per level up to level 100**; **class system unlocks at level 10** (Warrior, Mage, Healer, Rogue) | [Habitica FAQ](https://habitica.com/static/faq) |
| Economy | **Health Potion = 25 Gold, restores 15 HP**; **Enchanted Armoire = 100 Gold** (random gear/food/EXP); **Orb of Rebirth = 6 Gems**, free at level 50 and again at 100 | [Habitica FAQ](https://habitica.com/static/faq) |
| Death | Reaching **zero HP** costs the player **one level, that level's stat point, all Gold, and one piece of equipment** | [Habitica FAQ](https://habitica.com/static/faq) |
| Harm-reduction options | A **"Pause Damage"** setting stops HP loss from missed Dailies; **Constitution** reduces damage taken; the Rogue's **Stealth** skill dodges Dailies; shared Dailies under a **Group Plan** do not damage members | [Habitica FAQ](https://habitica.com/static/faq) |
| Social / boss battles | **Parties of 1–30 members**; completing tasks damages the quest boss, and **party members' missed Dailies damage the entire party**. Critically, **Constitution does not reduce boss damage** | [Habitica FAQ](https://habitica.com/static/faq) |
| Party sizing | Max raised/limited to **30 on 11 April 2017** for performance reasons; designers consider **~6 members ideal for quests** and **4+ for accountability**; quest progress applies only at Cron | [Habitica Wiki: Party](https://habitica.fandom.com/wiki/Party) |

### Documented reaction, criticism, and design rationale
- **Stated design rationale (positive):** the colour system exists to encourage users to attempt harder tasks, and parties are described as boosting motivation and accountability ([Habitica FAQ](https://habitica.com/static/faq)).
- **Collective-punishment risk, acknowledged by the community wiki:** "one party member can kill themselves and other party members by leaving multiple Dailies unfinished at Cron," and larger parties are described as **"paradoxically easier and more dangerous"** — more damage output against the boss, but also more incoming damage risk ([Habitica Wiki: Party](https://habitica.fandom.com/wiki/Party)).
- **External criticism** (from a 2026 review written by builders of a competing app — treat as *interested* commentary, though it is specific and consistent with the mechanics above): the HP/death mechanic "can be genuinely punishing… creates real anxiety for some users, and it's common to hear players admit they **'cheat'** to keep their character from dying." The same review flags an unchanged dated 8-bit UI after ten years, no offline mode, an overwhelming onboarding for new and ADHD users, and users who delete the app after a strong first week ([HabitSlayer Habitica review](https://habitslayer.com/guides/habitica-review)).
- **Fetch failure:** the Habitica wiki's dedicated Health page (`https://habitica.fandom.com/wiki/Health`) was blocked by robots rules, so exact damage formulas are `n.a.` for this report.

### Relevance to Lit Technica
Habitica is the clearest example of **loss-based** gamification: it is highly motivating for some and anxiety-producing for others, and the vendor itself ships escape hatches (Pause Damage, Stealth, Constitution, no-damage group Dailies). If a mechanic needs that many opt-outs, the opt-out is arguably the real product.

**URLs fetched:** https://habitica.com/static/faq · https://habitica.fandom.com/wiki/Party · https://habitslayer.com/guides/habitica-review

---

## 2. 4 The Words — word counts as RPG monster battles

### What it is
4 The Words is a browser-based writing application whose core loop is "Defeat monsters by writing" — writing words is the attack action against timed monster encounters across **40 areas**, with a levelling hero ([4thewords.com](https://4thewords.com/)).

### Concrete mechanics

| Mechanic | Concrete detail | Source |
|---|---|---|
| Core battle | **Writing Battles**: write a required number of words before a timer runs out to defeat the monster | [4thewords.com](https://4thewords.com/) |
| Variants | **Endurance Sprints**; **Multiplayer Battles** for teams of **2–8** writers against large monsters | [4thewords.com](https://4thewords.com/) |
| Items | **Potions** deal extra damage or buy extra time; **monster mastery** unlocks further rewards | [4thewords.com](https://4thewords.com/) |
| Streak threshold | Daily streak requires **444 words**; the interface shows "Today's writing streak: X/444 words" with a badge that moves **Pending → Complete** | [4TW help: Writing Streaks](https://help.4thewords.com/writing/writing-streaks/overview) |
| Day boundary | Midnight in the account's own timezone | [4TW help: Writing Streaks](https://help.4thewords.com/writing/writing-streaks/overview) |
| Three counters | **Current Streak** (resets on a miss), **Longest Streak**, and **Total Streak Days — which never resets** | [4TW help: Writing Streaks](https://help.4thewords.com/writing/writing-streaks/overview) |
| Cosmetic progression | Dashboard frame upgrades from **Wood at 4 days** through to **Alien at 3,000+ days**; Streak Wings and Medals as rewards | [4TW help: Writing Streaks](https://help.4thewords.com/writing/writing-streaks/overview) |
| Long-horizon rewards | "8 Years of Streak Rewards", from **day 1 to day 2,920** | [4thewords.com](https://4thewords.com/) |
| Streak repair currency | **Stempo** items: **2 Stempos to repair a past day**, **1 Stempo to reserve a future day**; cannot repair further back than **30 calendar days**. Stempos are bought, earned from quests and streak rewards, or crafted at the Gansu Watering Hole | [4TW: Streak repairs & reserve](https://4thewords.tawk.help/article/streak-repairs-reserve) |
| Free save | **Fixing *today* costs 0 Stempos** if the user simply logs in | [4TW: Streak repairs & reserve](https://4thewords.tawk.help/article/streak-repairs-reserve) |
| Scale claims | 6+ billion words written, ~5 million words/day, 125,000+ files, 19,000+ projects | [4thewords.com](https://4thewords.com/) |

### Documented reaction and design rationale
- **Explicit anti-shame rationale from the vendor:** the free same-day repair exists because "4thewords values **'showing up' for writing, even if that means not writing**," and repairs generally exist because "**life can get in the way**" ([4TW: Streak repairs & reserve](https://4thewords.tawk.help/article/streak-repairs-reserve)).
- **Structural forgiveness:** the **Total Streak Days counter never resets**, so a broken run does not erase the record of cumulative effort ([4TW help: Writing Streaks](https://help.4thewords.com/writing/writing-streaks/overview)).
- **Positive user testimony (vendor-published, so promotional):** Hugo and Nebula winner Mary Robinette Kowal: "It turns the writing process into an RPG game where you fight monsters by writing. Quests! Gear! Costumes!… inspiration and strength to write during the roughest times" ([4thewords.com](https://4thewords.com/)).
- **Fetch failure:** `https://4thewords.com/en/how-to-play` returned 404, so the full battle-damage formula is `n.a.`

### Relevance to Lit Technica
4 The Words is the best worked example of **streaks-with-forgiveness in a writing context**: a low daily threshold (444 words, well under NaNoWriMo's 1,667), three parallel counters so one bad day cannot delete all evidence of progress, a free same-day rescue, and an explicit product value that *showing up* counts.

**URLs fetched:** https://4thewords.com/ · https://help.4thewords.com/writing/writing-streaks/overview · https://4thewords.tawk.help/article/streak-repairs-reserve

---

## 3. Written? Kitten! — minimal pure-reward mechanic

### What it is
A free single-page web writing tool: you type in a plain text box, and every time you cross a chosen word threshold a new cute kitten photograph appears beside your text ([Fiction Writers Review, by Celeste Ng](https://fictionwritersreview.com/shoptalk/written-kitten/)).

**Primary-source caveat:** both `https://writtenkitten.co/` (blocked by robots rules) and `https://writtenkitten.net/` (bad robots code) could not be fetched. The mechanics below therefore come from a credible secondary source — a Fiction Writers Review "Shop Talk" piece written by novelist Celeste Ng.

### Concrete mechanics
- The reward threshold is **user-selectable at 100, 200, 500 or 1,000 words** ([Fiction Writers Review](https://fictionwritersreview.com/shoptalk/written-kitten/)).
- There is **no penalty of any kind** — the only state change is the arrival of a new picture ([Fiction Writers Review](https://fictionwritersreview.com/shoptalk/written-kitten/)).

### Documented reaction and design rationale
- Ng describes it as "**Perfect for those of us who work better with positive reinforcement**," and explicitly contrasts it with tools such as Write or Die, which "**dole out punishment**" ([Fiction Writers Review](https://fictionwritersreview.com/shoptalk/written-kitten/)).
- She frames the reward with Muriel Spark's advice on cats aiding concentration ([Fiction Writers Review](https://fictionwritersreview.com/shoptalk/written-kitten/)).
- Additional supporting commentary appeared in search results but **was not fetched**, and is therefore listed only as an unverified lead, not as evidence: a HuffPost piece contrasting it with Write or Die's threats (https://www.huffpost.com/entry/cute-cats_n_1099383) and a writing blog describing it as "strictly reward, no punishment" (https://kathywaller1.com/2013/01/04/safe-guilt-free-online-resources-for-the-addictive-writer/). Treat these as `n.a.` until fetched.

### Relevance to Lit Technica
The minimum viable non-punitive mechanic. Two properties matter: the reward is **unconditional on quality or schedule** (it fires on words written, never on words *not* written), and the **threshold is user-chosen**, which makes the whole loop autonomy-supporting rather than imposed.

**URL fetched:** https://fictionwritersreview.com/shoptalk/written-kitten/

---

## 4. NaNoWriMo — badges, progress bars, and a fixed public quota

### What it is
National Novel Writing Month was an annual creative-writing event in which participants attempted **50,000 words between 1 November 00:00:00 and 30 November 23:59:59**, tracked on a central website. The organising nonprofit **dissolved on 31 March 2025**, citing financial struggles and "community vitriol" ([Wikipedia: National Novel Writing Month](https://en.wikipedia.org/wiki/National_Novel_Writing_Month)).

### Concrete mechanics

| Mechanic | Concrete detail | Source |
|---|---|---|
| Target | **50,000 words in 30 days ≈ 1,667 words/day** (≈69 words/hour, ≈1.2 words/minute) | [Wikipedia](https://en.wikipedia.org/wiki/National_Novel_Writing_Month) |
| Rules | No pre-November prose; the event explicitly instructs participants to "prioritize speed and quantity over quality"; "rebels" pursuing other projects were tolerated | [Wikipedia](https://en.wikipedia.org/wiki/National_Novel_Writing_Month) |
| Prizes | **No official prizes for length, quality, or speed** — anyone reaching 50,000 words is a "winner," and badges were **self-awarded on the site** | [Wikipedia](https://en.wikipedia.org/wiki/National_Novel_Writing_Month) |
| Verification | From **20 November** participants could submit text for automatic verification, receiving a printable certificate, a web icon and a place on the winners list. Verification **ended with the 2019 site redesign**; afterwards, winning meant entering a number over 50,000 into the word-count box, with **no anti-cheating precautions** | [Wikipedia](https://en.wikipedia.org/wiki/National_Novel_Writing_Month) |
| Participation badges (2013, updated 2014; **not reinstated after the 2019 redesign**) | "You sure told us (about yourself)" — fill in author info; "You've joined your local community" — join a region; "You're buddied up" — add a writing buddy; "You're conversating" — post in the forums; "You're a donor" | [Wikiwrimo: Badge](https://www.wikiwrimo.org/wiki/Badge) |
| Other badge classes | **Writing badges** (auto-awarded per project), **personal achievement badges** (manually self-awarded), **forum badges** (2019+), support stickers, and physical Merit Badges | [Wikiwrimo: Badge](https://www.wikiwrimo.org/wiki/Badge) |
| Badge colour semantics | On year badges, **blue = participated, purple = won, halo = donated** | [Wikiwrimo: Badge](https://www.wikiwrimo.org/wiki/Badge) |
| Community layer | "Wrimos," Municipal Liaisons, pep talks, forums, writing buddies | [Wikipedia](https://en.wikipedia.org/wiki/National_Novel_Writing_Month) |
| Scale over time | 21 participants (1999) → **431,626 (2015)** → 400,000+ (2022) | [Wikipedia](https://en.wikipedia.org/wiki/National_Novel_Writing_Month) |

### Documented reaction and criticism
- **The quota is arbitrary and word count is a vanity metric.** A critical review states plainly that "**50,000 words is pretty arbitrary**" and that "**on its own, word count is a vanity metric**," adding that "these benchmarks on their own are **divorced from individual writers' goals**" ([Howdy Curiosity](https://www.howdycuriosity.com/blogs/curated-corner/beyond-50-000-words-a-critical-look-at-nanowrimos-impact-on-writers-and-the-industry)).
- **Fixed quotas drive unsustainable behaviour.** The same piece: "to meet these benchmarks, writers will often rely on **unsustainable habits**" — "staying up later or waking up earlier than they're comfortable with," "sacrificing time with friends and family," "neglecting exercise, cooking, or other healthy habits" ([Howdy Curiosity](https://www.howdycuriosity.com/blogs/curated-corner/beyond-50-000-words-a-critical-look-at-nanowrimos-impact-on-writers-and-the-industry)).
- **Quantity-only success criteria flatten quality.** "If you churn out 50,000 words of utter garbage, you are just as successful as someone who painstakingly crafts 50,000 words of polished prose," and the pace pushes writers to "string along series of events that lack a clear cohesiveness or compelling character development." Lisa Cron is quoted: "Can you write 50,000 words in a month? Sure. Will those words have meaning? Sure… in the dictionary. But that's not necessarily a story. It's just 50,000 words" ([Howdy Curiosity](https://www.howdycuriosity.com/blogs/curated-corner/beyond-50-000-words-a-critical-look-at-nanowrimos-impact-on-writers-and-the-industry)).
- **The achievement high is short-lived.** Under a heading "NaNoWriMo is a Quick High," the piece notes that "because it doesn't create sustainable writing habits and doesn't typically lend itself to honing your craft significantly, **it's short-lived**," asking "You finish NaNoWriMo, and then what? … Do you go back to not writing most days?" ([Howdy Curiosity](https://www.howdycuriosity.com/blogs/curated-corner/beyond-50-000-words-a-critical-look-at-nanowrimos-impact-on-writers-and-the-industry)).
- **The genuine strength is social, not mechanical.** "NaNo's biggest strength is creating a **sense of community and camaraderie**… Writers coming together to cheer each other on and support each other in maintaining accountability throughout November *is* incredibly valuable" ([Howdy Curiosity](https://www.howdycuriosity.com/blogs/curated-corner/beyond-50-000-words-a-critical-look-at-nanowrimos-impact-on-writers-and-the-industry)).
- **Explicit gap:** this critical source does **not** use the word "gamification," does not mention badges, and does not discuss public progress bars, shame, or peer comparison — so a *sourced* claim that NaNoWriMo's progress bars specifically caused shame is `n.a.` for this report. (A blog arguing that public word-count posts "inadvertently shame others who write more slowly" appeared in search results at https://jamiebowers.co.uk/writing-advice/the-productivity-paradox but was not fetched; treat as unverified.)
- **Contextual note on trust:** the organisation's collapse followed controversies including its 2024 AI-position statement, grooming and moderation allegations, and Inkitt/Manuscript Press sponsorship arrangements ([Wikipedia](https://en.wikipedia.org/wiki/National_Novel_Writing_Month)).

### Relevance to Lit Technica
NaNoWriMo is the cautionary case for **one global fixed quota**. Its most-praised element (community encouragement) and its most-criticised element (a universal 1,667 words/day benchmark divorced from individual goals) are separable — Lit Technica can adopt the former without the latter. Note also that badges here were largely **participation- and self-awarded**, i.e. non-competitive.

**URLs fetched:** https://en.wikipedia.org/wiki/National_Novel_Writing_Month · https://www.wikiwrimo.org/wiki/Badge · https://www.howdycuriosity.com/blogs/curated-corner/beyond-50-000-words-a-critical-look-at-nanowrimos-impact-on-writers-and-the-industry

---

## 5. Duolingo — streaks, leagues, and the most-documented streak-anxiety case

### What it is
A language-learning app whose retention engine is a daily streak, XP, and weekly leaderboard leagues.

### Concrete mechanics

| Mechanic | Concrete detail | Source |
|---|---|---|
| Streak | Consecutive days on which the learner completes a lesson | [Duolingo blog: how the streak builds habit](https://blog.duolingo.com/how-duolingo-streak-builds-habit/) |
| Streak Freeze | Pauses a missed day; **up to two can be equipped at a time** | [Duolingo blog](https://blog.duolingo.com/how-duolingo-streak-builds-habit/) |
| Early-streak psychology | Duolingo notes that going from **2 to 3 days is a 50% increase**, whereas **200 → 201 days is a 0.5% increase**, so early days feel far more consequential | [Duolingo blog](https://blog.duolingo.com/how-duolingo-streak-builds-habit/) |
| Measured effects | New streak animations raised new-learner **day-7 retention by +1.7%**; allowing **two** freezes raised daily actives **+0.38%** and "did not encourage learners to take more days off"; learners reaching a **7-day streak are 3.6× more likely to complete their course**; **6M+ learners** on 7+ day streaks | [Duolingo blog](https://blog.duolingo.com/how-duolingo-streak-builds-habit/) |
| Leagues | Leaderboards first tested in **2018** with 5 leagues; **10 leagues today**, Diamond at the top; a **new weekly league every Sunday** by timezone; learners matched by similar study habits and timezone | [Duolingo blog: leagues & leaderboards](https://blog.duolingo.com/duolingo-leagues-leaderboards/) |
| Diamond Tournament | Top 10 of Diamond league; phases Quarterfinals / Semifinals / Finals; does **not** run every week | [Duolingo blog: leagues](https://blog.duolingo.com/duolingo-leagues-leaderboards/) |
| **Opt-out** | Learners can **disable Leaderboards in Web Settings by toggling off "Make My Profile Public"** | [Duolingo blog: leagues](https://blog.duolingo.com/duolingo-leagues-leaderboards/) |
| League tiers (secondary source) | Bronze, Silver, Gold, Sapphire, Ruby, Emerald, Amethyst, Pearl, Obsidian, Diamond; 30 participants per league; weekly refresh; bottom ranks demoted | [Duolingo Fandom: League](https://duolingo.fandom.com/wiki/League) |

### Documented design rationale — including Duolingo's own admissions
- Duolingo **names loss aversion explicitly** as the mechanism sustaining long streaks, and in the same post concedes the downside: "**losing a day and breaking a streak can instead feel demotivating**," and "**the fear of losing a streak could prevent some learners from attempting one at all**." It cites University of Pennsylvania / UCLA research that "**offering people some slack can be more motivating than using rigid rules**" — the stated justification for Streak Freezes ([Duolingo blog](https://blog.duolingo.com/how-duolingo-streak-builds-habit/)).

### Documented criticism
- **Guilt-based notification design.** Business Insider documents post-streak-break emails including "🥺It's been three days…", "Have you already gotten sick of learning Portuguese?", and "🤔It looks like you've learned how to say 'quitter' in Portuguese." The app icon "melts into a carnivalesque nightmare," and a Super Bowl push read "No buts, do a lesson now" ([Business Insider](https://www.businessinsider.com/duolingo-meanest-app-nagging-notifications-melting-icon-gen-z-marketing-2024-7)).
- **A concrete abandonment case.** Kristen Smirnov broke a 52-day German streak while ill, was "flooded with notifications," and became disenchanted with the product ([Business Insider](https://www.businessinsider.com/duolingo-meanest-app-nagging-notifications-melting-icon-gen-z-marketing-2024-7)).
- **User language.** Users describe the approach as "**emotional blackmail**," "manipulative," "flat-out unethical," "psychotic," "unhinged," and "abusive"; one reply to head of product Cem Kansu reads: "Wow, **shame and guilt** are how you want to motivate people to learn? that is pretty shitty" ([Business Insider](https://www.businessinsider.com/duolingo-meanest-app-nagging-notifications-melting-icon-gen-z-marketing-2024-7)).
- **Evidence that shame can backfire.** The same reporting cites a 2010 study in which guilt and shame appeals in anti-drinking advertising triggered a **defensive response that made viewers more likely to drink more** ([Business Insider](https://www.businessinsider.com/duolingo-meanest-app-nagging-notifications-melting-icon-gen-z-marketing-2024-7)).
- **The counter-argument.** Duolingo states the alternatives it tested were **5–8% less effective**, and reported **31M+ DAU in Q1 2024 (+54% YoY) with +45% revenue**. Media ethicist Mara Einstein judges the tactics acceptable **because users can opt out** ([Business Insider](https://www.businessinsider.com/duolingo-meanest-app-nagging-notifications-melting-icon-gen-z-marketing-2024-7)).

### Independent experimental evidence on streaks
The strongest causal evidence found is an NBER working paper: Aulagnon, Cristia, Cueto & Malamud, **"Streaks to Success? The Effects of Highlighting Streaks on Student Effort and Learning," NBER Working Paper No. 34173, August 2025** — an RCT with **60,000 Peruvian 4th–6th graders** on the Conecta Ideas maths app over six weeks, with arms of Streak (12,000), Personalized Reminder (12,000), Generic Reminder (12,000) and Control (24,000) ([NBER WP 34173](https://www.nber.org/system/files/working_papers/w34173/w34173.pdf)).

- On the **extensive margin** (connecting at least once), Streak gave **+2.82pp**, Personalized Reminder **+3.79pp**, Generic Reminder **+1.40pp** ([NBER WP 34173](https://www.nber.org/system/files/working_papers/w34173/w34173.pdf)).
- On the **intensive margin**, Streak performed best: **+9.36pp** vs **+6.91pp** (Personalized) and **+2.51pp** (Generic) ([NBER WP 34173](https://www.nber.org/system/files/working_papers/w34173/w34173.pdf)).
- Streaks raised endline maths achievement by **0.13–0.17 SD**, and the authors found **no evidence of a discouragement effect after broken streaks** ([NBER WP 34173](https://www.nber.org/system/files/working_papers/w34173/w34173.pdf)).
- The same paper records that **Khan Academy retired its streak feature**, stating that "as currently designed, streaks can actually be demotivating, especially when circumstances beyond one's control… can be the reason a streak gets broken" ([NBER WP 34173](https://www.nber.org/system/files/working_papers/w34173/w34173.pdf)).
- It also reports Duolingo's own A/B results: highlighting streaks gave **+1% DAU and +3% day-14 retention**, and a "Streak Wager" gave **+14% day-7 retention** ([NBER WP 34173](https://www.nber.org/system/files/working_papers/w34173/w34173.pdf)).
- **Caveats stated in the paper:** endline participation was only **2.3%**, and the study ran in a summer-break setting ([NBER WP 34173](https://www.nber.org/system/files/working_papers/w34173/w34173.pdf)).

### Relevance to Lit Technica
The honest reading of the evidence is that **streaks work and can still hurt**. The measurable harm documented here comes not from the counter itself but from the **surrounding communication** — guilt-toned notifications after a break — and from **rigidity**. Duolingo's own data point is the most useful one for Lit Technica: allowing *two* freezes increased engagement and **did not** increase days off.

**Fetch failures:** `https://blog.duolingo.com/how-to-keep-your-streak/`, `/xp-and-leveling-up/`, and `/leaderboards-leagues-duolingo/` all returned client errors; XP-per-lesson values are therefore `n.a.`

**URLs fetched:** https://blog.duolingo.com/how-duolingo-streak-builds-habit/ · https://blog.duolingo.com/duolingo-leagues-leaderboards/ · https://duolingo.fandom.com/wiki/League · https://www.businessinsider.com/duolingo-meanest-app-nagging-notifications-melting-icon-gen-z-marketing-2024-7 · https://www.nber.org/system/files/working_papers/w34173/w34173.pdf

---

## 6. Forest — loss aversion done with unusual care

### What it is
A focus-timer app in which every minute of concentration grows a virtual tree; abandoning the session kills the tree ([Forest](https://www.forestapp.cc/)).

### Concrete mechanics

| Mechanic | Concrete detail | Source |
|---|---|---|
| Core loop | Choose a session length and tree species; the tree grows in real time; a finished session means the tree **joins your forest permanently** | [Forest](https://www.forestapp.cc/) |
| Loss mechanic | Leaving the app kills the tree. **Deep Focus** blocks or redirects other apps and cannot be switched off mid-session — the only exit is tapping **"Give Up,"** which kills the tree | [Forest](https://www.forestapp.cc/) |
| Failure display | **Dead trees remain in the forest** as "**an honest record of the journey**" — not hidden, and "**not described as a verdict or a source of shame**" | [Forest](https://www.forestapp.cc/) |
| Relief valve | Sessions can be paused for **up to 5 minutes** (Pro/Plus) | [Forest](https://www.forestapp.cc/) |
| Social | **Plant Together** rooms: everyone plants the same tree, and "if one person gives up, everyone's tree dies" | [Forest](https://www.forestapp.cc/) |
| Real-world tie-in | Coins fund real trees via Trees for the Future — **up to 5 real trees per account**; counter at **2,102,946 planted**; 2M+ since 2014 | [Forest](https://www.forestapp.cc/) |
| Other layers | Focus Challenge daily/monthly missions; tracking of streaks, hours and tags | [Forest](https://www.forestapp.cc/) |
| Scale | **60M+ downloads**, 4.8 App Store rating | [Forest](https://www.forestapp.cc/) |

### Documented design rationale
Forest states its aim as "**visible progress, gentle accountability, and a small sense of loss**," with the explicit stance "**no shame, no preaching, no 'crush your goals'**." It describes offering "encouragement when the user is close… and a soft reset when the user is not," and positions the app as "**a companion, not a coach**" ([Forest](https://www.forestapp.cc/)). Its ADHD rationale rests on visible progress plus immediate feedback, and it cites Ward et al. (2017) on smartphone presence reducing available cognitive capacity ([Forest](https://www.forestapp.cc/)).

### Trade-off analysis
Forest is a loss-aversion mechanic, but the loss is **bounded, small, self-inflicted, and interpretively reframed**: one tree, in a forest that keeps growing, described as a record rather than a judgement. Contrast Habitica, where failure removes accumulated levels, gold and equipment. The **Plant Together** mode is the exception — it reintroduces the collective-punishment shape seen in Habitica boss battles ([Forest](https://www.forestapp.cc/), [Habitica Wiki: Party](https://habitica.fandom.com/wiki/Party)).

**URL fetched:** https://www.forestapp.cc/

---

## 7. Research on gamification, creative writing, and backfire effects

### 7a. The overjustification effect
The overjustification effect is "a phenomenon in psychology in which providing an expected external incentive… for an already intrinsically rewarding activity can reduce a person's intrinsic motivation to perform that activity," often described as motivational "**crowding out**" ([Wikipedia: Overjustification effect](https://en.wikipedia.org/wiki/Overjustification_effect)). In Deci's 1971 experiment, a paid experimental group spent significantly *more* time on a puzzle during paid sessions but significantly *less* time than controls once payment stopped ([Wikipedia](https://en.wikipedia.org/wiki/Overjustification_effect)).

Directly on gamification: "A number of academics and other critics have expressed concern that these rewards [points, badges, virtual currency] may backfire through the overjustification effect," specifically where gamified contexts fail to meet self-determination theory's three needs — **relatedness, autonomy, competence** ([Wikipedia](https://en.wikipedia.org/wiki/Overjustification_effect)).

The moderators matter enormously and cut both ways:
- **Initial interest is the critical moderator.** "Rewards consistently reduced motivation among high-interest groups"; conversely a 2001 meta-analysis showed rewards can **increase** intrinsic motivation for tasks that initially hold little intrinsic interest ([Wikipedia](https://en.wikipedia.org/wiki/Overjustification_effect)).
- **Informational vs controlling framing decides the outcome.** Rewards "interpreted as providing positive information about an individual's competence and self-control may increase intrinsic motivation," while rewards "perceived as external control decrease feelings of self-control and competence, which in turn decreases intrinsic motivation" ([Wikipedia](https://en.wikipedia.org/wiki/Overjustification_effect)).
- **Contingency shape matters.** **Task-contingent** rewards (tied to completing the task) can reduce intrinsic motivation; **task-non-contingent** rewards (given simply for participation) are less likely to, and may leave intrinsic motivation unchanged ([Wikipedia](https://en.wikipedia.org/wiki/Overjustification_effect)).
- **Counter-evidence exists.** Eisenberger and Cameron (1996) argued the lab conditions — reward introduced then arbitrarily withdrawn — do not reflect real-world incentive plans, and that reduced interest may reflect a negative reaction to reward withdrawal rather than lost intrinsic motivation ([Wikipedia](https://en.wikipedia.org/wiki/Overjustification_effect)).

### 7b. Self-determination theory critiques of gamification
An SDT-grounded analysis of gamification in medical education defines the overjustification effect as "the net negative effect on engagement and motivation from an **overreliance on external motivating regulations**," and states that "**if baseline interest is high… adding extra rewards leads to overjustification and loss of intrinsic motivation**" ([Rutledge, Walsh et al., "Gamification in Action" (PDF)](https://selfdeterminationtheory.org/wp-content/uploads/2020/10/2018_RutledgeWalshEtAl_Gamification.pdf)).

Concrete findings and recommendations from that paper ([PDF](https://selfdeterminationtheory.org/wp-content/uploads/2020/10/2018_RutledgeWalshEtAl_Gamification.pdf)):
- In a resident leaderboard study, **badges were perceived as the least motivating element**; badges primarily help learners who are **amotivated** to begin with.
- Competition-induced stress harms all three needs — competence, autonomy and relatedness — and **low-ranked learners are demotivated by visible leaderboards**.
- Reported attrition: **33%** (knowledge competition) and **27%** (infant CPR).
- Recommendations: align mechanics to goals; **break big goals into small process goals**; give choice and opt-in; maximise **collaboration over competition**; **consider anonymising or de-identifying performance data**; **avoid making poor performance prominently visible**; and design so that "**successful gamification works itself out of a job**."

A clinical-education blog reaches the same conclusions from the design side, warning against "**rhetorical gamification**" — "using game elements to yield the appearance of a game without attending to alignment between those elements and outcome goals" — and noting that gamification "can motivate achievement of extrinsic goals without learning," e.g. points per video completed producing fast clicking rather than understanding ([ICE Blog: Align the Game to Your Aim](https://icenet.blog/2025/06/17/align-the-game-to-your-aim-considering-gamification-through-the-lens-of-self-determination-theory/)). It also stresses that "games are **not always fun or motivating**" and that specific game moments become "demoralizing, frustrating, competitive, or unpleasant" ([ICE Blog](https://icenet.blog/2025/06/17/align-the-game-to-your-aim-considering-gamification-through-the-lens-of-self-determination-theory/)).

### 7c. The strongest single backfire finding: Hanus & Fox (2015)
**Hanus, M. D. & Fox, J. (2015), "Assessing the effects of gamification in the classroom: A longitudinal study on intrinsic motivation, social comparison, satisfaction, effort, and academic performance," *Computers & Education* 80, 152–161, DOI 10.1016/j.compedu.2014.08.019** ([ICE Blog citation](https://icenet.blog/2025/06/17/align-the-game-to-your-aim-considering-gamification-through-the-lens-of-self-determination-theory/)).

In the gamified groups — using badges, leaderboards and points — **intrinsic motivation decreased, classroom satisfaction decreased, and final exam performance decreased** ([SDT/gamification review PDF, University of Arizona](https://journals.librarypublishing.arizona.edu/itlt/article/id/4872/download/pdf/)). The same review reports two mitigating findings from that work: rewards **might increase** motivation for students who were bored or did not want to be in the classroom, and "**gamification is more likely to work when learners can choose whether to participate**" ([Arizona PDF](https://journals.librarypublishing.arizona.edu/itlt/article/id/4872/download/pdf/)). The mechanism offered is Cognitive Evaluation Theory: badges, leaderboards and points "naturally produce feelings of competence," but to help intrinsic motivation they must **also elicit a sense of autonomy**; "if rewards are perceived as controlling or forced, they can harm students' autonomy" ([Arizona PDF](https://journals.librarypublishing.arizona.edu/itlt/article/id/4872/download/pdf/)).

### 7d. Evidence that complicates the pessimistic reading
The same review is scrupulous about counter-evidence ([Arizona PDF](https://journals.librarypublishing.arizona.edu/itlt/article/id/4872/download/pdf/)):
- **Mekler et al. (2017)** — points, levels and leaderboards produced **no real difference in measured intrinsic motivation**, an **increase in tasks performed**, and **no decrease in task quality**.
- **Groening & Binnewies (2019)** — badges and leaderboards produced no significant self-reported motivation difference but **increased persistence** (tasks completed).
- **Denny (2013)** — badges increased student contributions **with no reduction in quality**.
- **Garris et al. (2002)**, reviewing 21 studies — **8 of 11** studies on retention found higher retention for game-based training, and **7 of 8** found students preferred simulation-game activities.
- Overall the review concludes there is "**no conclusive evidence that gamification positively affects learners' intrinsic motivation**," and proposes increased **overall** motivation (extrinsic moving toward internalised) as "a more realistic goal than increased intrinsic motivation alone."

### 7e. Gamification specifically in writing
**Pentikäinen & Kallionpää, "A Systematic Review of Research on Learning Writing Skills Using Gamification," *Seminar.net* Vol. 20 No. 2 (2024), DOI 10.7577/seminar.5712** reviewed 11 articles and found that games' immersive aspects encourage young writers' **sense of agency, fluency and internal motivation**, and support verbal rehearsal, collaborative creation, idea generation and character development ([Seminar.net](https://journals.oslomet.no/seminar/article/view/5712/)). The identified drawback is that in **factual** writing, games "can also develop an incoherent writing attitude," and the review flags **transfer of learning** as an open research gap ([Seminar.net](https://journals.oslomet.no/seminar/article/view/5712/)).

Note the direction of that finding: for **creative** writing the reviewed evidence leans positive, and the caution attaches to factual/expository writing. This is the closest thing to direct evidence for Lit Technica's domain, though it concerns learners rather than working novelists.

**Fetch failure:** the Nielsen Norman Group article on gamification and motivation (`https://www.nngroup.com/articles/gamification-motivation/`) returned a client error, so mainstream UX-research commentary is `n.a.` for this report.

**URLs fetched:** https://en.wikipedia.org/wiki/Overjustification_effect · https://selfdeterminationtheory.org/wp-content/uploads/2020/10/2018_RutledgeWalshEtAl_Gamification.pdf · https://icenet.blog/2025/06/17/align-the-game-to-your-aim-considering-gamification-through-the-lens-of-self-determination-theory/ · https://journals.librarypublishing.arizona.edu/itlt/article/id/4872/download/pdf/ · https://journals.oslomet.no/seminar/article/view/5712/

---

## 8. Scrivener — the low-key contrast case

### What it is
Scrivener is a long-form writing application by Literature & Latte. Its goal-tracking is entirely informational: targets and statistics, with no game layer.

### Concrete mechanics
All from the official Literature & Latte blog ([Track Statistics and Targets in Your Scrivener Projects](https://www.literatureandlatte.com/blog/track-statistics-and-targets-in-your-scrivener-projects)):

| Mechanic | Concrete detail |
|---|---|
| Setting targets | **Project ▸ Show Project Targets** sets both a **project** word target and a **session** word target |
| Visual design | **Blue progress lines**, displayed as two thin bars above and below the Quick Search field in the toolbar — **top = project, bottom = session** |
| Per-document targets | Set via the **bulls-eye icon** in the footer view of an individual document |
| Notification | An **optional** "Show Target Notifications" setting fires when a target is reached |
| Statistics | **Project ▸ Statistics** reports words, characters, sentences and paragraphs; the Draft/Manuscript folder is counted and the **Research folder is excluded** |
| Penalties | **None.** No streaks, no HP, no badges, no shaming — progress is simply visible "at a glance" |

Secondary sources (not primary-fetched, flagged as such) add that the bars grade in colour from red to green as they fill, that the session target can auto-calculate from a draft deadline and the writing days you select, and that a "Show overrun" option exists — see [Scrivener For Dummies, ch. 14 (O'Reilly)](https://www.oreilly.com/library/view/scrivener-for-dummies/9781118312469/a6_22_9781118312469-ch14.html) and [Gwen Hernandez: Project Targets in Scrivener](https://gwenhernandez.com/2011/01/25/tech-tuesday-project-targets-in-scrivener/).

### Documented reaction and rationale
The official post frames targets purely as visibility — knowing where you are in a project and in today's session — rather than as a motivational system. No documented user backlash was found in the fetched sources; this is a mechanic with essentially no failure state to resent ([Literature & Latte](https://www.literatureandlatte.com/blog/track-statistics-and-targets-in-your-scrivener-projects)).

**Fetch failure:** `https://www.literatureandlatte.com/scrivener/features` returned "not found."

### Relevance to Lit Technica
Scrivener demonstrates the floor: a bar that fills, a number that goes up, and **nothing that happens when you stop**. Two details are worth copying directly — the **auto-calculating session target derived from a deadline and the user's own chosen writing days** (which makes the daily number personal rather than universal, the exact failure of NaNoWriMo's 1,667), and **notifications that are opt-in and fire only on success**.

**URLs fetched:** https://www.literatureandlatte.com/blog/track-statistics-and-targets-in-your-scrivener-projects · https://www.oreilly.com/library/view/scrivener-for-dummies/9781118312469/a6_22_9781118312469-ch14.html · https://gwenhernandez.com/2011/01/25/tech-tuesday-project-targets-in-scrivener/

---

## Cross-case comparison

| App | Positive mechanic | Penalty on failure | Escape hatch | Failure visible to others? |
|---|---|---|---|---|
| **Habitica** | XP, Gold, gear, levels, boss quests ([FAQ](https://habitica.com/static/faq)) | **HP loss; at 0 HP lose a level, stat point, all Gold and one equipment item** ([FAQ](https://habitica.com/static/faq)) | Pause Damage, Constitution, Stealth, Group Plan ([FAQ](https://habitica.com/static/faq)) | **Yes — missed Dailies damage the whole party** ([Wiki](https://habitica.fandom.com/wiki/Party)) |
| **4 The Words** | Monster defeats, frames, wings, medals ([site](https://4thewords.com/)) | Current streak resets; **Total Streak Days never resets** ([help](https://help.4thewords.com/writing/writing-streaks/overview)) | Stempo repairs; **today free** ([repairs](https://4thewords.tawk.help/article/streak-repairs-reserve)) | Only in opt-in multiplayer battles ([site](https://4thewords.com/)) |
| **Written? Kitten!** | Kitten photo per 100/200/500/1,000 words ([FWR](https://fictionwritersreview.com/shoptalk/written-kitten/)) | **None** ([FWR](https://fictionwritersreview.com/shoptalk/written-kitten/)) | n/a | No |
| **NaNoWriMo** | Badges, winner certificate, community ([Wikipedia](https://en.wikipedia.org/wiki/National_Novel_Writing_Month), [Wikiwrimo](https://www.wikiwrimo.org/wiki/Badge)) | Not "winning" the fixed 50,000 ([Wikipedia](https://en.wikipedia.org/wiki/National_Novel_Writing_Month)) | Self-awarded badges; rebels tolerated ([Wikipedia](https://en.wikipedia.org/wiki/National_Novel_Writing_Month)) | Yes — public winners list ([Wikipedia](https://en.wikipedia.org/wiki/National_Novel_Writing_Month)) |
| **Duolingo** | Streak, XP, 10 leagues ([blog](https://blog.duolingo.com/duolingo-leagues-leaderboards/)) | Streak reset + **guilt-toned notifications** ([Business Insider](https://www.businessinsider.com/duolingo-meanest-app-nagging-notifications-melting-icon-gen-z-marketing-2024-7)) | 2 Streak Freezes ([blog](https://blog.duolingo.com/how-duolingo-streak-builds-habit/)) | Leaderboards, **toggleable off** ([blog](https://blog.duolingo.com/duolingo-leagues-leaderboards/)) |
| **Forest** | Tree grows and joins forest permanently ([site](https://www.forestapp.cc/)) | One dead tree, kept as "an honest record" ([site](https://www.forestapp.cc/)) | 5-minute pause ([site](https://www.forestapp.cc/)) | Only in opt-in Plant Together ([site](https://www.forestapp.cc/)) |
| **Scrivener** | Blue progress bars, optional success notification ([L&L](https://www.literatureandlatte.com/blog/track-statistics-and-targets-in-your-scrivener-projects)) | **None** ([L&L](https://www.literatureandlatte.com/blog/track-statistics-and-targets-in-your-scrivener-projects)) | n/a | No |

---

## Synthesized gamification design principles for Lit Technica

Eight principles, each with its supporting citation.

### 1. Make the game layer optional and switchable — autonomy is the load-bearing variable
The single most consistent finding across the research is that **choice** determines whether mechanics help or harm: "gamification is more likely to work when learners can choose whether to participate," and rewards perceived "as controlling or forced… can harm students' autonomy" ([Arizona SDT review](https://journals.librarypublishing.arizona.edu/itlt/article/id/4872/download/pdf/)). Duolingo already implements this for its most comparative feature — leaderboards can be disabled by toggling off "Make My Profile Public" ([Duolingo blog](https://blog.duolingo.com/duolingo-leagues-leaderboards/)), and Habitica ships a "Pause Damage" setting ([Habitica FAQ](https://habitica.com/static/faq)).
**For Lit Technica:** streaks, completion percentages, and story-readiness scores should each be independently switchable, defaulting to visible-but-quiet. A user who turns off the streak counter should lose nothing else.

### 2. Never let a lapse delete accumulated progress — use a never-resetting cumulative counter
4 The Words maintains **three** counters — Current Streak, Longest Streak, and **Total Streak Days, which never resets** ([4TW help](https://help.4thewords.com/writing/writing-streaks/overview)). Compare Habitica, where hitting zero HP costs a level, a stat point, all Gold and a piece of equipment ([Habitica FAQ](https://habitica.com/static/faq)) — a mechanic reviewers describe as "genuinely punishing," creating "real anxiety," with players admitting they "cheat" to avoid it ([HabitSlayer](https://habitslayer.com/guides/habitica-review)).
**For Lit Technica:** a "total days written" and "total words this manuscript" figure should be monotonically increasing and unbreakable. Only the *current* run resets.

### 3. Build forgiveness into streaks by default, and make the cheapest save free
Duolingo's own experiment found that permitting **two** Streak Freezes at once raised daily actives **+0.38%** and "did not encourage learners to take more days off," and it cites research that "**offering people some slack can be more motivating than using rigid rules**" ([Duolingo blog](https://blog.duolingo.com/how-duolingo-streak-builds-habit/)). 4 The Words goes further: **repairing today costs nothing** if you merely log in, because "4thewords values 'showing up' for writing, even if that means not writing" ([4TW streak repairs](https://4thewords.tawk.help/article/streak-repairs-reserve)). Khan Academy retired streaks precisely because "circumstances beyond one's control… can be the reason a streak gets broken" ([NBER WP 34173](https://www.nber.org/system/files/working_papers/w34173/w34173.pdf)).
**For Lit Technica:** grant forgiveness tokens automatically rather than selling them, and let a user who opens the app and writes nothing still keep the day.

### 4. Let the user set the target — a universal quota is a shame machine
NaNoWriMo's fixed 1,667 words/day is criticised because "50,000 words is pretty arbitrary," "on its own, word count is a vanity metric," and "these benchmarks on their own are divorced from individual writers' goals," pushing writers into "unsustainable habits" ([Howdy Curiosity](https://www.howdycuriosity.com/blogs/curated-corner/beyond-50-000-words-a-critical-look-at-nanowrimos-impact-on-writers-and-the-industry)). Written? Kitten! lets the writer pick their own reward threshold from 100/200/500/1,000 words ([Fiction Writers Review](https://fictionwritersreview.com/shoptalk/written-kitten/)), and Scrivener derives the session target from the user's own deadline and chosen writing days ([Literature & Latte](https://www.literatureandlatte.com/blog/track-statistics-and-targets-in-your-scrivener-projects)).
**For Lit Technica:** every quota should be user-authored or user-derived. Suggest a number; never impose one.

### 5. Reward showing up and small process steps, not just completion
SDT-based guidance recommends "**break big goals into small process goals**" ([Rutledge/Walsh SDT paper](https://selfdeterminationtheory.org/wp-content/uploads/2020/10/2018_RutledgeWalshEtAl_Gamification.pdf)). This also protects intrinsic motivation structurally: **task-contingent** rewards (tied to completing the task) can reduce intrinsic motivation, whereas **task-non-contingent** rewards given for participation "may leave intrinsic motivation unchanged" ([Wikipedia: Overjustification effect](https://en.wikipedia.org/wiki/Overjustification_effect)). Duolingo notes the psychological asymmetry that early days matter most — 2→3 days is a 50% increase, 200→201 is 0.5% ([Duolingo blog](https://blog.duolingo.com/how-duolingo-streak-builds-habit/)).
**For Lit Technica:** celebrate the first 50 words of a session and the act of opening the manuscript, not only chapter completion or checklist 100%.

### 6. Keep rewards informational, never controlling — and never notify about failure
Whether a reward helps or harms depends on framing: rewards "interpreted as providing positive information about an individual's competence" may **increase** intrinsic motivation, while those "perceived as external control" decrease it ([Wikipedia: Overjustification effect](https://en.wikipedia.org/wiki/Overjustification_effect)). Duolingo's documented failure mode is not the streak but the messaging around its loss — "🤔It looks like you've learned how to say 'quitter' in Portuguese," described by users as "emotional blackmail" and by one as "shame and guilt are how you want to motivate people to learn? that is pretty shitty" ([Business Insider](https://www.businessinsider.com/duolingo-meanest-app-nagging-notifications-melting-icon-gen-z-marketing-2024-7)). The same reporting cites a 2010 study where guilt-and-shame appeals produced a **defensive backfire** ([Business Insider](https://www.businessinsider.com/duolingo-meanest-app-nagging-notifications-melting-icon-gen-z-marketing-2024-7)). Scrivener's notification setting fires only on **reaching** a target, and is optional ([Literature & Latte](https://www.literatureandlatte.com/blog/track-statistics-and-targets-in-your-scrivener-projects)).
**For Lit Technica:** ship no notification whose trigger is inactivity. Notify on achievement only.

### 7. Prefer collaboration to competition, and never display anyone's shortfall publicly
SDT guidance is explicit: **maximise collaboration over competition**, **consider anonymising or de-identifying performance data**, and **avoid making poor performance prominently visible** — low-ranked learners are demotivated by visible leaderboards, badges were rated the **least motivating** element, and competition studies showed **33%** and **27%** attrition ([Rutledge/Walsh SDT paper](https://selfdeterminationtheory.org/wp-content/uploads/2020/10/2018_RutledgeWalshEtAl_Gamification.pdf)). Avoid collective-punishment shapes: in Habitica, "one party member can kill themselves and other party members by leaving multiple Dailies unfinished at Cron" ([Habitica Wiki: Party](https://habitica.fandom.com/wiki/Party)), and in Forest's Plant Together "if one person gives up, everyone's tree dies" ([Forest](https://www.forestapp.cc/)). Meanwhile the element critics of NaNoWriMo still praise is purely supportive: "NaNo's biggest strength is creating a sense of community and camaraderie" ([Howdy Curiosity](https://www.howdycuriosity.com/blogs/curated-corner/beyond-50-000-words-a-critical-look-at-nanowrimos-impact-on-writers-and-the-industry)).
**For Lit Technica:** shared writing sprints and buddy encouragement, yes; ranked leaderboards and group-failure penalties, no.

### 8. Treat lapses as record, not verdict — and design the mechanic to become unnecessary
Forest keeps dead trees in the forest as "**an honest record of the journey**," explicitly "**not described as a verdict or a source of shame**," under a stated stance of "**no shame, no preaching, no 'crush your goals'**" and a self-description as "**a companion, not a coach**" ([Forest](https://www.forestapp.cc/)). The SDT literature adds the long-run test: "**successful gamification works itself out of a job**" ([Rutledge/Walsh SDT paper](https://selfdeterminationtheory.org/wp-content/uploads/2020/10/2018_RutledgeWalshEtAl_Gamification.pdf)), which matters especially for novelists who arrive already intrinsically motivated — the group for whom "if baseline interest is high… adding extra rewards leads to overjustification and loss of intrinsic motivation" ([Rutledge/Walsh SDT paper](https://selfdeterminationtheory.org/wp-content/uploads/2020/10/2018_RutledgeWalshEtAl_Gamification.pdf)) and among whom "rewards consistently reduced motivation" ([Wikipedia: Overjustification effect](https://en.wikipedia.org/wiki/Overjustification_effect)).
**For Lit Technica:** show gaps in the writing history neutrally, as data. And because the target audience is a self-selected, already-motivated group of novelists, keep the game layer light by default and let it fade as the habit establishes.

### A note on honest trade-offs
The evidence does **not** support the claim that gamification always harms. Streaks produced real learning gains of **0.13–0.17 SD** with **no evidence of a discouragement effect after breaks** in a 60,000-student RCT ([NBER WP 34173](https://www.nber.org/system/files/working_papers/w34173/w34173.pdf)); points, levels and leaderboards did not measurably reduce intrinsic motivation in Mekler et al. (2017), while increasing task volume without quality loss ([Arizona SDT review](https://journals.librarypublishing.arizona.edu/itlt/article/id/4872/download/pdf/)); and in creative writing specifically, game elements were found to encourage "agency, fluency, and internal motivation" ([Seminar.net](https://journals.oslomet.no/seminar/article/view/5712/)). The defensible position for Lit Technica is therefore not "avoid gamification" but "**keep the upside mechanics, remove the loss mechanics, and make everything optional**."

---

## Full list of URLs fetched in this research session

**Successfully fetched:**
1. https://habitica.com/static/faq
2. https://habitica.fandom.com/wiki/Party
3. https://habitslayer.com/guides/habitica-review
4. https://4thewords.com/
5. https://help.4thewords.com/writing/writing-streaks/overview
6. https://4thewords.tawk.help/article/streak-repairs-reserve
7. https://fictionwritersreview.com/shoptalk/written-kitten/
8. https://en.wikipedia.org/wiki/National_Novel_Writing_Month
9. https://www.wikiwrimo.org/wiki/Badge
10. https://www.howdycuriosity.com/blogs/curated-corner/beyond-50-000-words-a-critical-look-at-nanowrimos-impact-on-writers-and-the-industry
11. https://blog.duolingo.com/how-duolingo-streak-builds-habit/
12. https://blog.duolingo.com/duolingo-leagues-leaderboards/
13. https://duolingo.fandom.com/wiki/League
14. https://www.businessinsider.com/duolingo-meanest-app-nagging-notifications-melting-icon-gen-z-marketing-2024-7
15. https://www.nber.org/system/files/working_papers/w34173/w34173.pdf
16. https://www.forestapp.cc/
17. https://en.wikipedia.org/wiki/Overjustification_effect
18. https://selfdeterminationtheory.org/wp-content/uploads/2020/10/2018_RutledgeWalshEtAl_Gamification.pdf
19. https://icenet.blog/2025/06/17/align-the-game-to-your-aim-considering-gamification-through-the-lens-of-self-determination-theory/
20. https://journals.librarypublishing.arizona.edu/itlt/article/id/4872/download/pdf/
21. https://journals.oslomet.no/seminar/article/view/5712/
22. https://www.literatureandlatte.com/blog/track-statistics-and-targets-in-your-scrivener-projects
23. https://www.oreilly.com/library/view/scrivener-for-dummies/9781118312469/a6_22_9781118312469-ch14.html
24. https://gwenhernandez.com/2011/01/25/tech-tuesday-project-targets-in-scrivener/

**Attempted but failed (values from these are marked `n.a.` above):**
- https://habitica.fandom.com/wiki/Health — blocked by robots rules
- https://writtenkitten.co/ — blocked by robots rules
- https://writtenkitten.net/ — bad robots code
- https://blog.duolingo.com/how-to-keep-your-streak/ — client error
- https://blog.duolingo.com/xp-and-leveling-up/ — client error
- https://blog.duolingo.com/leaderboards-leagues-duolingo/ — client error
- https://www.nngroup.com/articles/gamification-motivation/ — client error
- https://4thewords.com/en/how-to-play — 404
- https://www.literatureandlatte.com/scrivener/features — not found
