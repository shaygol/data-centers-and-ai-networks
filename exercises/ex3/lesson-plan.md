<style>
body { direction: rtl; text-align: right; }
table { direction: rtl; }
th, td { text-align: right; }
</style>

<div dir="rtl" align="right" style="direction: rtl; text-align: right;">

# יחידה 3, חלק ב' — מערך שיעור: עשר שנים של טופולוגיות Clos ובקרה מרכזית (`Jupiter Rising`)

* **קורס:** רשתות תקשורת למרכזי נתונים ובינה מלאכותית (0-361.2.2460) · פרופ' חן אבין
* **פורמט:** 2 × 50 דקות, פרונטלי · כיתה הפוכה
* **מאמר ליבה:** *Jupiter Rising: A Decade of Clos Topologies and Centralized Control in Google's Datacenter Network* (Singh et al., [CACM 2016](https://github.com/shaygol/data-centers-and-ai-networks/blob/main/articles/Jupiter%20Rising%20-%20Decade%20of%20Clos%20Topologies%20in%20Google%20Datacenter%20Network.pdf) / [SIGCOMM '15](https://github.com/shaygol/data-centers-and-ai-networks/blob/main/articles/Jupiter%20Rising%20-%20Decade%20of%20Clos%20Topologies%20in%20Google%20Datacenter%20Network_v2.pdf))
* **מאמר הקשר (רזרבה):** [*RNG: Flat Datacenter Networks at Scale*](https://github.com/shaygol/data-centers-and-ai-networks/blob/main/articles/RNG%20-%20Flat%20Datacenter%20Networks%20at%20Scale.pdf) (Bernardi et al., arXiv '26)
* **הכנת הסטודנטים (שיעורי בית):** משחק `Miswire Hunt` על טופולוגיית JR-16, קטעי הקריאה בחלק א', ושאלות שכבות ה-SDN (שאלות 1–3 בחלק ג') באתר [דף המשחק ושיעורי הבית](https://shaygol.github.io/data-centers-and-ai-networks/index.html)
* **חומרי הנחיה:** [מצגת השיעור (`Homework review`)](https://shaygol.github.io/data-centers-and-ai-networks/lesson.html#homework), [שער המצגת (`Agenda`)](https://shaygol.github.io/data-centers-and-ai-networks/lesson.html), [לוח הבקרה למרצה (`instructor.html`)](https://shaygol.github.io/data-centers-and-ai-networks/instructor.html), [אתר שיעורי הבית (`index.html`)](https://shaygol.github.io/data-centers-and-ai-networks/index.html)

> **הערת מספור:** כל מספרי הסעיפים והאיורים במערך זה ובמצגת `lesson.html` תואמים לגרסת [CACM 2016](https://github.com/shaygol/data-centers-and-ai-networks/blob/main/articles/Jupiter%20Rising%20-%20Decade%20of%20Clos%20Topologies%20in%20Google%20Datacenter%20Network.pdf) של המאמר. בטאב [`Paper`](https://shaygol.github.io/data-centers-and-ai-networks/lesson.html#paper) שבמצגת מופיעים קישורים לשתי הגרסאות ([CACM 2016](https://github.com/shaygol/data-centers-and-ai-networks/blob/main/articles/Jupiter%20Rising%20-%20Decade%20of%20Clos%20Topologies%20in%20Google%20Datacenter%20Network.pdf) ו-[SIGCOMM '15](https://github.com/shaygol/data-centers-and-ai-networks/blob/main/articles/Jupiter%20Rising%20-%20Decade%20of%20Clos%20Topologies%20in%20Google%20Datacenter%20Network_v2.pdf)), שמספרי הסעיפים והאיורים בהן עשויים להיות שונים.

---

## שליף מהיר להנחיה בכיתה

### צ'קליסט 2 דקות לפני תחילת השיעור
* **טאב 1 ([לוח הבקרה למרצה `instructor.html`](https://shaygol.github.io/data-centers-and-ai-networks/instructor.html)):** פתוח, מחובר מראש ורענן לאחר הדדליין (13:00), כדי לחשוף מיד את 5 התקלות ומפות החום בלי עיכוב טכני.
* **טאב 2 ([מצגת המנחה `lesson.html`](https://shaygol.github.io/data-centers-and-ai-networks/lesson.html#homework)):** פתוח מראש על [`Homework review`](https://shaygol.github.io/data-centers-and-ai-networks/lesson.html#homework) (או על [שער `Agenda`](https://shaygol.github.io/data-centers-and-ai-networks/lesson.html)), בהגדלת תצוגה נוחה למקרן וערכת נושא מותאמת לאולם.
* **גיבוי מהיר לפערי מספור:** לזכור שבטאב [`Paper`](https://shaygol.github.io/data-centers-and-ai-networks/lesson.html#paper) קיימות שתי גרסאות המאמר ([CACM 2016](https://github.com/shaygol/data-centers-and-ai-networks/blob/main/articles/Jupiter%20Rising%20-%20Decade%20of%20Clos%20Topologies%20in%20Google%20Datacenter%20Network.pdf) ו-[SIGCOMM '15](https://github.com/shaygol/data-centers-and-ai-networks/blob/main/articles/Jupiter%20Rising%20-%20Decade%20of%20Clos%20Topologies%20in%20Google%20Datacenter%20Network_v2.pdf)) אם סטודנט שואל על שוני במספר סעיף או איור.

### טבלת הרצה בזמן אמת (בלוק וזמן, מה לוחצים, משפט מעבר, שבירת שתיקה ושעון עצירה)

<table dir="rtl" align="right" style="direction: rtl; text-align: right;">
  <thead>
    <tr>
      <th align="right">בלוק וזמן</th>
      <th align="right">מה לוחצים על המסך</th>
      <th align="right">משפט מעבר לכניסה לבלוק</th>
      <th align="right">רמז לשבירת שתיקה בכיתה</th>
      <th align="right">שעון עצירה קשיח</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td align="right"><strong>שעה 1 · 0:00–0:12</strong><br>סקירת שיעורי הבית</td>
      <td align="right">חושפים 5 תקלות ומפות חום ב-<a href="https://shaygol.github.io/data-centers-and-ai-networks/instructor.html"><code>instructor.html</code></a>, ועוברים ל-<a href="https://shaygol.github.io/data-centers-and-ai-networks/lesson.html#homework"><code>Homework review</code></a> (JR-16)</td>
      <td align="right"><em>(פתיחת השיעור)</em>: "הסתכלתי על ההגשות שלכם מהבית — בואו נראה אילו תקלות קפצו מיד ואילו הסתירו את עצמן"</td>
      <td align="right">"מי שיבץ את <code>CPN</code> במישור הבקרה ומי כמחוץ לתמונת ה-SDN — תנו טיעון של משפט אחד"</td>
      <td align="right"><strong>0:12</strong> — סוגרים את שאלה 3 ולוחצים <code>Next</code></td>
    </tr>
    <tr>
      <td align="right"><strong>שעה 1 · 0:12–0:35</strong><br>קטע 1: <a href="https://shaygol.github.io/data-centers-and-ai-networks/lesson.html#openflow"><code>Why OpenFlow</code></a></td>
      <td align="right">מפעילים את סימולציית הלינק הבודד, ואז פותחים את 6 הרמזים אחד-אחד</td>
      <td align="right">"בשאלה 3 ראינו ש-Firepath שונה מ-OpenFlow — אבל Jupiter כן עבר ל-OpenFlow. בואו נגלה מה דחף אותם לשם"</td>
      <td align="right">"אם כל מתג מחשב מסלולים לעצמו על CPU חלש וכולם עולים יחד אחרי הפסקת חשמל — מה קורס ראשון?"</td>
      <td align="right"><strong>0:35</strong> — שאלת סגירה אחת ולוחצים <code>Next</code></td>
    </tr>
    <tr>
      <td align="right"><strong>שעה 1 · 0:35–0:50</strong><br>קטע 2: <a href="https://shaygol.github.io/data-centers-and-ai-networks/lesson.html#traffic"><code>Traffic</code></a></td>
      <td align="right">מציגים שאלת דיון + איור 1 (פותחים <code>Data table</code> רק אם נשאר זמן)</td>
      <td align="right">"הבנו <em>איך</em> שלטו ברשת; עכשיו נראה <em>איזה גל תעבורה</em> הכריח אותם לבנות הכול מאפס — ולהחליף 5 דורות בעשור"</td>
      <td align="right">"מה קורה היום באשכולות AI שלא היה בכלל על המפה ב-2014?"</td>
      <td align="right"><strong>0:50</strong> — יוצאים להפסקה</td>
    </tr>
    <tr>
      <td align="right"><strong>שעה 2 · 0:00–0:25</strong><br>קטע 3: <a href="https://shaygol.github.io/data-centers-and-ai-networks/lesson.html#generations~legacy"><code>Generations</code></a></td>
      <td align="right">מתקדמים ב-6 הפרקים עם <code>Next</code>; חושפים שיפורים/אתגרים רק אחרי ניחוש הכיתה</td>
      <td align="right">"ראינו את הצמיחה פי 50. עכשיו נעקוב אחרי 5 הניסיונות של גוגל לעמוד בקצב — מה עבד ומה נשבר בכל דור"</td>
      <td align="right"><em>(ב-Firehose 1.1)</em>: "תספרו כמה קווים יוצאים מריבוע אחד בשורה העליונה — וכמה ריבועים יש בשורה התחתונה"</td>
      <td align="right"><strong>0:04</strong> Legacy · <strong>0:08</strong> FH1.0 · <strong>0:14</strong> FH1.1 · <strong>0:18</strong> Watchtower+Saturn · <strong>0:25</strong> סיום Jupiter</td>
    </tr>
    <tr>
      <td align="right"><strong>שעה 2 · 0:25–0:43</strong><br>קטע 4: <a href="https://shaygol.github.io/data-centers-and-ai-networks/lesson.html#practice"><code>Theory vs practice</code></a></td>
      <td align="right">פותחים כרטיס רק אחרי שהכיתה מעלה פער; קופצים ל-<a href="https://shaygol.github.io/data-centers-and-ai-networks/lesson.html#clos"><code>Clos failures</code></a> / <a href="https://shaygol.github.io/data-centers-and-ai-networks/lesson.html#congestion"><code>Congestion</code></a> רק לפני <strong>0:38</strong></td>
      <td align="right">"ב-Jupiter נשברה ההנחה שכל המתגים זהים. אילו עוד הנחות של ה-Fat-Tree מיחידה 1 נשברות כשבונים אותו במציאות?"</td>
      <td align="right">"תחשבו על מה שקרה לכם במשחק בבית, או על אובדן חבילות ב-25% — איפה המודל מהלוח שיקר לנו?"</td>
      <td align="right"><strong>0:43</strong> — עוברים לסיכום</td>
    </tr>
    <tr>
      <td align="right"><strong>שעה 2 · 0:43–0:50</strong><br>סיכום ומעבר ליחידה 4</td>
      <td align="right">ללא שקף ייעודי (נשארים על הסיכום בעל-פה)</td>
      <td align="right">"אם הייתם צריכים לסכם לסטודנט מיחידה 1 מה Jupiter הוסיף ל-Fat-Tree — מה המשפט?"</td>
      <td align="right">סבב קצר של משפט אחד לסטודנט + גשר ל-<code>WCMP</code>, <code>FlowBender</code> ו-<code>DCTCP</code> בשבוע הבא</td>
      <td align="right"><strong>0:50</strong> — סיום השיעור</td>
    </tr>
  </tbody>
</table>

---

## מטרות השיעור

1. **ארכיטקטורת SDN והמעבר מ-Firepath ל-OpenFlow:** הבנת ההפרדה של Firepath בין ריכוז מצב הקישורים לביזור חישוב טבלאות הניתוב, וניתוח הגורמים שדחפו את גוגל לבקרה מרכזית מלאה ב-OpenFlow.
2. **צמיחת התנועה בדאטה-סנטר:** בחינת קצב הגידול ההיסטורי (פי 50 בין 2008 ל-2014), השוואה למגמות התעשייה ולקיבולת פבריקים מאוחרים יותר, והבנת השפעת האחסון המבוזר על תנועה מחוץ לארון.
3. **אבולוציית החומרה בחמישה דורות:** מעקב אחר המסלול מהרשת המסחרית (2004) ו-Firehose 1.0 עד Jupiter ו-Centauri — כולל המבנה הפנימי של הבלוקים, ההבדל בין בלוק חוסם לבלוק לא-חוסם, ושרידות החיווט.
4. **הפער בין תיאוריה לפרקטיקה:** זיהוי 9 הנחות היסוד של עץ ה-Fat-Tree מיחידה 1 שנשברות בפריסה אמיתית בקנה מידה גדול.
5. **אבחון תקלות ותפעול שוטף:** תפקיד Neighbor Discovery (`ND`) כמאמת חיווט וכמנגנון חיים (keepalive) ממשחק `Miswire Hunt`, והסיבות לגודש ולאובדן חבילות בבאפרים רדודים גם בניצולת ממוצעת של 25%.

---

## ציר זמן מרוכז

<table dir="rtl" align="right" style="direction: rtl; text-align: right;">
  <thead>
    <tr>
      <th align="right">שלב</th>
      <th align="right">זמן</th>
      <th align="right">בלוק / טאב ב-<a href="https://shaygol.github.io/data-centers-and-ai-networks/lesson.html"><code>lesson.html</code></a></th>
      <th align="right">אופן עבודה</th>
      <th align="right">עוגן במאמר (CACM 2016)</th>
      <th align="right">מטרה</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td align="right"><strong>0</strong></td>
      <td align="right"><strong>בבית (~60 דק')</strong></td>
      <td align="right">משחק <code>Miswire Hunt</code> ושאלות 1–3</td>
      <td align="right"><a href="https://shaygol.github.io/data-centers-and-ai-networks/index.html">אתר שיעורי הבית (<code>index.html</code>)</a></td>
      <td align="right">§5.1–§5.2</td>
      <td align="right">1, 5</td>
    </tr>
    <tr>
      <td align="right"><strong>1</strong></td>
      <td align="right"><strong>שעה 1 · 0:00–0:12</strong></td>
      <td align="right">סקירת שיעורי הבית (<a href="https://shaygol.github.io/data-centers-and-ai-networks/lesson.html#homework"><code>Homework review</code></a> + <a href="https://shaygol.github.io/data-centers-and-ai-networks/instructor.html"><code>instructor.html</code></a>)</td>
      <td align="right">לוח מרצה + אנימציה + דיון כיתתי</td>
      <td align="right">§5.2</td>
      <td align="right">1, 5</td>
    </tr>
    <tr>
      <td align="right"><strong>2</strong></td>
      <td align="right"><strong>שעה 1 · 0:12–0:35</strong></td>
      <td align="right">קטע 1: מ-Firepath ל-OpenFlow (<a href="https://shaygol.github.io/data-centers-and-ai-networks/lesson.html#openflow"><code>Why OpenFlow</code></a>)</td>
      <td align="right">קריאה מודרכת + סימולציה + 6 רמזים</td>
      <td align="right">§5.1–§5.2, §6.2, איורים 11–12</td>
      <td align="right">1, 5</td>
    </tr>
    <tr>
      <td align="right"><strong>3</strong></td>
      <td align="right"><strong>שעה 1 · 0:35–0:50</strong></td>
      <td align="right">קטע 2: צמיחת התנועה (<a href="https://shaygol.github.io/data-centers-and-ai-networks/lesson.html#traffic"><code>Traffic</code></a>)</td>
      <td align="right">קריאה + תרשים + טבלת נתונים</td>
      <td align="right">§1–§2, איור 1, טבלה 2</td>
      <td align="right">2</td>
    </tr>
    <tr>
      <td align="right">—</td>
      <td align="right"><em>10 דקות</em></td>
      <td align="right"><em>הפסקה בין השעות</em></td>
      <td align="right"></td>
      <td align="right"></td>
      <td align="right"></td>
    </tr>
    <tr>
      <td align="right"><strong>4</strong></td>
      <td align="right"><strong>שעה 2 · 0:00–0:25</strong></td>
      <td align="right">קטע 3: חמישה דורות (<a href="https://shaygol.github.io/data-centers-and-ai-networks/lesson.html#generations~legacy"><code>Generations</code></a>, 6 פרקים)</td>
      <td align="right">סיפור מודרך + איורי פנים-הבלוקים</td>
      <td align="right">§2–§3.3, §4.1, טבלאות 1–2, איורים 3–9</td>
      <td align="right">3</td>
    </tr>
    <tr>
      <td align="right"><strong>5</strong></td>
      <td align="right"><strong>שעה 2 · 0:25–0:43</strong></td>
      <td align="right">קטע 4: תיאוריה מול פרקטיקה (<a href="https://shaygol.github.io/data-centers-and-ai-networks/lesson.html#practice"><code>Theory vs practice</code></a>)</td>
      <td align="right">9 פערים (+ קפיצה אופציונלית למעבדות)</td>
      <td align="right">§1, §3.1–§3.3, §5.2, §6.1–§6.2</td>
      <td align="right">4, 5</td>
    </tr>
    <tr>
      <td align="right"><strong>6</strong></td>
      <td align="right"><strong>שעה 2 · 0:43–0:50</strong></td>
      <td align="right">סיכום ומעבר ליחידה 4 (ללא שקף ייעודי)</td>
      <td align="right">סבב כיתתי</td>
      <td align="right">—</td>
      <td align="right">1–5</td>
    </tr>
    <tr>
      <td align="right"><strong>רזרבה</strong></td>
      <td align="right"><strong>אם נשאר זמן</strong></td>
      <td align="right"><a href="https://shaygol.github.io/data-centers-and-ai-networks/lesson.html#clos"><code>Clos failures</code></a> · <a href="https://shaygol.github.io/data-centers-and-ai-networks/lesson.html#congestion"><code>Congestion</code></a> · <a href="https://shaygol.github.io/data-centers-and-ai-networks/lesson.html#rng"><code>RNG</code></a></td>
      <td align="right">מעבדות אינטראקטיביות / קריאה עתידית</td>
      <td align="right">§1, §5.2, §6.1</td>
      <td align="right">4, 5</td>
    </tr>
  </tbody>
</table>

*(המצגת נפתחת בטאב [`Agenda`](https://shaygol.github.io/data-centers-and-ai-networks/lesson.html), וכפתור `Next` בתחתית המסך מוביל לפי הסדר הזה בדיוק).*

---

## שעה 1: שיעורי בית, מ-Firepath ל-OpenFlow וצמיחת התנועה (50 דקות)

### 0:00–0:12 · סקירת שיעורי הבית (טאב [`Homework review`](https://shaygol.github.io/data-centers-and-ai-networks/lesson.html#homework) + [`instructor.html`](https://shaygol.github.io/data-centers-and-ai-networks/instructor.html))
* **הצגה על המסך:**
  * פתחו את [לוח הבקרה למרצה (`instructor.html`)](https://shaygol.github.io/data-centers-and-ai-networks/instructor.html) לחשיפת 5 התקלות האמיתיות במשחק ומפות החום של תשובות הסטודנטים (בטאב [`Homework review`](https://shaygol.github.io/data-centers-and-ai-networks/lesson.html#homework) שבמצגת אין כפתור חשיפה של התקלות בממשק).
  * במקביל או מיד לאחר מכן, הציגו את טאב [`Homework review`](https://shaygol.github.io/data-centers-and-ai-networks/lesson.html#homework) המראה את טופולוגיית JR-16 ואת האנימציה של הפצת ה-`LSD` וזרימות ה-`ECMP` בין הזוגות.
* **שאלות הפתיחה על המסך:**
  * *"אילו תקלות אנשים מצאו ראשונות, ואילו לקחו הכי הרבה זמן?"*
  * *"מה היה קשה? מה אהבתם? איפה נתקעתם?"*
  * דוגמה לדיון על כבילה שגויה: מי מצא את `T4:p2 ↔ AG4:d4` (או את החלפת הכבלים `AG3:d1/d2`) ואיך זיהיתם שהכבל חובר לפורט הלא נכון?
* **5 סוגי התקלות ב-JR-16 ולמה הן קורות (שליף מהיר למרצה — משפט אחד לכל תקלה):**
  1. **כבילה שגויה (`Miswired`):** כבל אופטי חובר בטעות לפורט או לבלוק הלא-נכון במהלך תחזוקה ידנית, כך שהשכן שהתגלה בפועל אינו תואם לתוכנית הפריסה הסטטית (`Cluster Config`).
  2. **לינק מנותק (`Link down`):** כבל אופטי שלא חובר כלל, נותק מהמגש או נקרע בשני סיביו, ולכן אין קליטת אות אופטי כלל (`PHY DOWN` בשני הקצוות).
  3. **לינק חד-כיווני (`One-way`):** אחד משני סיבי האופטיקה (TX או RX) נשבר/נמעך או שליזר השידור באחד הקצוות נשרף, כך שאור עובר בכיוון אחד בלבד והצד השני אינו קולט דבר.
  4. **שיעור שגיאות גבוה (`High errors`):** לכלוך על מחבר האופטיקה, עיקום בסיב או רכיב אופטי שחוק המאפשרים למסגרות לעבור אך גורמים לשגיאות CRC מרובות ולשידורים חוזרים שקטים ב-TCP.
  5. **שכן שותק / קריסת תוכנה (`Peer silent` / "Dark switch"):** תוכנת מערכת ההפעלה במתג קרסה לחלוטין והפסיקה לשלוח פעימות `ND`, בעוד החומרה והאופטיקה עדיין מוזנות חשמל ומשאירות אות קליטה פעיל (`PHY UP`) בשכנים.
* **תובנת מפתח — למה בודקים את שני הקצוות?**
  * בניתוב מבוזר קלאסי (כמו OSPF), כבל שגוי יוצר שכנות תקינה לכאורה ועלול לגרום ללולאות ניתוב.
  * ב-Firepath, מנגנון `ND` משווה את מזהה השכן שהתקבל מול ה-`Cluster Config` הסטטי; אי-התאמה גורמת להשבתת הפורט לפני שיעביר תעבורה.
  * ניקוז לינק תקין גורע קיבולת מהפבריק, בעוד השארת לינק תקול או חד-כיווני בניתוב פוגעת באמינות ובאובדן חבילות.
* **חלק ג' — שכבות ה-SDN (שאלות 1–3):**
  * מעבר מהיר על הרכיבים השנויים במחלוקת מלוח המרצה (`Cluster config` ← ניהול; `LSD` ← בקרה; `Forwarding table` ← נתונים; והדיון על `ND`, `CPN` ו-`BGP`).
  * **רמז לשבירת שתיקה:** *"מי שיבץ את `CPN` במישור הבקרה ומי כמחוץ לתמונת ה-SDN — תנו טיעון של משפט אחד."*
  * **הכרעה בשאלה 3 (*מה Firepath עושה שבקר OpenFlow סטנדרטי לא היה עושה?*):** Firepath **מרכז** את איסוף והפצת מצב הקישורים (`LSD` שגודלו נכנס ב-64 KB דרך ה-`CPN`), אבל **מבזר** את חישוב טבלאות הניתוב — כל מתג מחשב מקומית מסלולים קצרים עם `ECMP` ומתכנת את החומרה שלו. בקר OpenFlow קלאסי מחשב את הנתיבים במרכז ומתקין כללי זרימה פרטניים בכל מתג.
* **נקודת עצירה (0:12):** מסכמים את שאלה 3 ולוחצים `Next` אל [`Why OpenFlow`](https://shaygol.github.io/data-centers-and-ai-networks/lesson.html#openflow).

### 0:12–0:35 · קטע 1: מ-Firepath ל-OpenFlow (טאב [`Why OpenFlow`](https://shaygol.github.io/data-centers-and-ai-networks/lesson.html#openflow))
* **משפט מעבר לכניסה לבלוק:** *"בשאלה 3 ראינו ש-Firepath שונה מ-OpenFlow — אבל Jupiter כן עבר ל-OpenFlow. בואו נגלה מה דחף אותם לשם."*
* **שאלת הדיון המרכזית:** *"Firepath הריץ את Firehose, Watchtower ו-Saturn. Jupiter רץ על OpenFlow. המאמר אף פעם לא אומר במפורש למה. מה דחף אותם לשם?"*
* **קטעי הקריאה המוטמעים (§5.1–§5.2, איורים 11–12):** הדגישו יחד עם הכיתה מתוך הטקסט מה מרוכז (המאסטר, איסוף ובניית ה-`LSD`, וה-`CPN` מחוץ לפס) ומה נשאר מקומי (גילוי שכנים `ND`, חישוב ה-`ECMP` ותכנות הטבלאות בחומרה).
* **סימולציית התזכורת ("תקלה בלינק בודד"):** הדגמה קצרה על המסך של הפער בין התנהגות Firepath (B) ל-OpenFlow (C) כשלינק נופל.
* **רמז לשבירת שתיקה:** *"אם כל מתג מחשב מסלולים לעצמו על CPU חלש וכולם עולים יחד אחרי הפסקת חשמל — מה קורס ראשון?"*
* **ששת הרמזים — לפתוח אחד-אחד לפי התקדמות הכיתה:**
  1. **המעבדים של המתגים עצמם (§6.2):** דוגמה פתורה על המסך לאפקט כדור השלג לאחר נפילת חשמל ואתחול סימולטני של כל הפבריק: חישוב המסלולים ו-`ND` מתחרים על CPU מוטמע חלש ← `ND` מאחר להחזיר פעימות לב ← שכנים מדווחים שהלינק נפל ← עדכון `LSD` חדש מוסיף עוד חישובי מסלול ← התשובה המאוחרת מחזירה את הלינק ← סערת דיווחים שהתייצבה רק בהעלאה ידנית בלוק-אחר-בלוק.  
     * **הערת מרצה:** במאמר עצמו (§6.2) הפתרון המיידי בתוך Firepath היה הורדת עדיפות של תהליכים לא-קריטיים על מעבד המתג, כוונון טיימרים של `ND` ובדיקות עומס וירטואליות; המסקנה להוציא את חישוב המסלולים לשרתים חיצוניים היא ההסבר הארכיטקטוני לכיוון של OpenFlow.
  2. **הם כבר עשו את זה פעם אחת (§2):** ב-B4 WAN גוגל כבר הוציאה פרוטוקולי בקרה ותכנון תעבורה לשרתים חיצוניים עם מעבדים חזקים יותר. *שאלה לכיתה:* אם זה עבד ב-B4, מה נותר שעצר אותם בדאטה-סנטר?
  3. **מתגים שלא מתאמים ביניהם (§5.2):** ~2,000 אירועי ניתוב בחודש. דוגמה פתורה (משלנו, לא מהמאמר) של לולאה זמנית במסלול `A → B → C → D` (וגיבוי `A → E → D`) כשלינק `C–D` נופל: `C` מתעדכן ראשון ומחזיר חבילות ל-`B`, שעדיין מצביע אל `C` — החבילות קופצות ביניהן עד שה-TTL נגמר. *פרשנות שלנו:* בקר מרכזי רואה את כל המתגים ויכול לתזמן סדר עדכונים (`B` ו-`A` לפני `C`), אם כי המאמר לא מציין אם Jupiter מבצע זאת.
  4. **חצי מהצעד כבר נעשה (§5.1):** ל-Firepath כבר היו בקר מסלולים מרכזי ו-`CPN` אמין מחוץ לפס. *שאלה לכיתה:* מה הדבר היחיד שנותר להעביר למרכז?
  5. **המחיר של ריכוזיות (§5.2, §6.2):** פיצול ב-`CPN` (ותקלות חד-כיווניות בציוד מזדקן) יוצר מצב **multi-master**. דוגמה פתורה על המסך: `M1` ו-`M2` בשני חצאי `CPN` מנותקים — תקלה בחצי של `M2` גורמת לכך שרק המתגים של `M2` עוקפים אותה, ואלה של `M1` ממשיכים לשלוח לשם תנועה שאובדת. תשובת המאמר: התראה והתערבות ידנית. מחוץ למאמר: במפרט OpenFlow 1.3 (§6.3.5) כל מתג מקבל שינויים ממאסטר אחד בלבד באמצעות `generation ID` ודוחה בקר מיושן (`"is slave"`).  
     * **הערת מרצה (לשאלה מתקדמת):** `generation ID` מונע משני בקרים לכתוב בו-זמנית *לאותו מתג*, אך בפיצול רשת מלא לשני חצאים מנותקים הוא אינו מונע משני מאסטרים לנהל כל אחד חצי אחר — מניעת `split-brain` ברמת הפבריק כולו דורשת קונצנזוס/קוורום בין הבקרים (כמו Paxos או Raft).
  6. **אחרי המאמר (מחוץ למאמר — בלוג Google Cloud אוקטובר 2024 / Orion 2016):** גרסאות ה-SDN של Jupiter משיגות אמינות גבוהה פי 50 לעומת הגרסאות הקודמות. *שאלה לכיתה:* האם הנתון הזה סוגר את הדיון, או שהסיכונים מרמז 5 עדיין קיימים?
* **שאלות סגירה לבלוק:**
  * איזה רמז שכנע אתכם הכי הרבה, ולמה?
  * האם Firepath היה טעות, או הבחירה הנכונה לחומרה ולכלים של 2005?
* **נקודת עצירה (0:35):** בוחרים שאלת סגירה אחת ולוחצים `Next` אל [`Traffic`](https://shaygol.github.io/data-centers-and-ai-networks/lesson.html#traffic).

### 0:35–0:50 · קטע 2: צמיחת התנועה (טאב [`Traffic`](https://shaygol.github.io/data-centers-and-ai-networks/lesson.html#traffic))
* **משפט מעבר לכניסה לבלוק:** *"הבנו איך שלטו ברשת; עכשיו נראה איזה גל תעבורה הכריח אותם לבנות הכול מאפס — ולהחליף 5 דורות בעשור."*
* **שאלת הדיון:** *"איור 1 עוצר ב-2014 עם הכפלה בערך כל שנה (גידול של פי 50 בין יולי 2008 לנובמבר 2014, קצב של כל 12–15 חודשים). האם התנועה המשיכה להכפיל את עצמה כל שנה?"*
* **קטעי הקריאה המוטמעים (§1–§2):**
  * גוגל לא יכלה לקנות רשת מסחרית שתעמוד בקצב ובסקייל בשום מחיר.
  * מנועי הגידול: גישה לאחסון מרוחק, עיבוד נתונים בקנה מידה גדול, שירותי אינטרנט אינטראקטיביים ועליית Google Cloud Platform.
* **ניתוח התרשים וטבלת הנתונים (`Data table`):**
  * **עד נובמבר 2014 (נתוני המאמר):** עקומת איור 1 נמדדת ביחס ליולי 2008 (`1x` ← `50x`). ההמשך בגרף הוא **סקיצה להמחשה בלבד** (גוגל הפסיקה לפרסם את סדרת התנועה הזו אחרי 2014).
  * **נתוני תעשייה (Cisco Global Cloud Index):** 3.4 ZB לשנה ב-2014 ← ~6.8 ZB ב-2016 ← תחזית ~20.5 ZB ב-2021 — הכפלה כל **2–3 שנים**, איטית יותר מקצב ההכפלה השנתי בגוגל עד 2014.
  * **קיבולת פבריק יחיד (טבלה 2 + פרסומי Google Cloud 2022 ו-2024):** Jupiter ב-2012 סיפק 1.3 Pb/s; ב-2022 (`Jupiter + OCS`) מעל 6 Pb/s; וב-2023 (`Jupiter, 400G core`) הגיע ל-13.1 Pb/s — פי 10 לפבריק בודד, לצד דיווח שגוגל מפעילה כיום "מאות פבריקים של Jupiter" בעולם.
* **חיבור ליחידה 1 ולסיום שעה 1:**
  * *מה מניע היום תעבורת דאטה-סנטר שלא היה שם ב-2014?* (אימון והרצת מודלי AI גדולים, תקשורת GPU צפופה).
  * **רמז לשבירת שתיקה:** *"מה קורה היום באשכולות AI שלא היה בכלל על המפה ב-2014?"*
  * סתירה מול מאמר *Data Centers in the Wild* (שם 75%–80% מהתעבורה נשארה בארון): באחסון מבוזר ומשותף (Colossus / Bigtable / Spanner), רוב קלט/פלט האחסון חוצה את הארון ואת בלוק האגרגציה דרך שכבת ה-`Spine`.
* **נקודת עצירה (0:50):** עוצרים כאן ויוצאים להפסקת 10 דקות.

---

*(הפסקת 10 דקות)*

---

## שעה 2: חמישה דורות של Clos ותיאוריה מול פרקטיקה (50 דקות)

### 0:00–0:25 · קטע 3: חמישה דורות (טאב [`Generations`](https://shaygol.github.io/data-centers-and-ai-networks/lesson.html#generations~legacy) — 6 פרקים דרך `Next`)
* **משפט מעבר לכניסה לבלוק:** *"ראינו את הצמיחה פי 50. עכשיו נעקוב אחרי 5 הניסיונות של גוגל לעמוד בקצב — מה עבד ומה נשבר בכל דור."*
* **קצב יעד (שעון עצירה פנימי):** **0:04** סיום Legacy ← **0:08** סיום Firehose 1.0 ← **0:14** סיום Firehose 1.1 ← **0:18** סיום Watchtower + Saturn יחד (4 דקות לשניהם) ← **0:25** סיום Jupiter ומעבר ל-[`Theory vs practice`](https://shaygol.github.io/data-centers-and-ai-networks/lesson.html#practice).
* **אופן עבודה אחיד בכל פרק:** פותחים בשאלת הדיון שעל המסך ← בוחנים את הטופולוגיה, שרטוטי "מה יש בתוך הבלוקים", איורי המאמר וטבלת ההשוואה לדור הקודם (טבלה 2) ← ורק בסוף לוחצים לחשיפת השיפורים והאתגרים.
* **פרק 1 · רשת Legacy (2004, §2):**
  * *מבנה:* נתבי ליבה מסחריים (`Cluster routers`) מעל ~500 מתגי `ToR`, 40 שרתים לארון (20 אלף שרתים סה"כ), 4×1G למעלה — חסימה של ~10:1 (`~100 Mb/s` לשרת מול שרתים בארונות אחרים, 2 Tbps bisection) ואובדן חבילות קשה מ-incast ו-outcast.
  * *דיון:* היכן תמקמו אפליקציה שדורשת רוחב-פס גבוה? (כולה תחת `ToR` יחיד).
* **פרק 2 · Firehose 1.0 (2005, §3.1, איור 3):**
  * *מבנה:* Clos ראשון משבבי 8×10G מסחריים (4×10G ב-`ToR`), יעד של 1 Gb/s לא-חוסם ל-10 אלף שרתים (10 Tbps). *בתוך הבלוקים:* ה-`Spine` בנוי מ-12 לוחות (4 מעל 8 בקישוריות מלאה); ה-`Aggregation` בנוי משני חצאי 4×4 נפרדים שאין ביניהם קישור ישיר (רק ה-`ToRs` למטה נוגעים בשני החצאים — ולכן הבלוק מסומן כחוסם `(B)`).
  * *דיון:* גוגל לא בנתה מתגים מעולם אבל בנתה שרתים כל הזמן — איפה שמים את השבבים ומה עלול להשתבש? ← כרטיסי `PCI` בתוך שרתים; קריסות, שדרוגים ואתחולים ארוכים של שרתים הפילו את הרשת, חיווט הנחושת היה סיוט, והדור **מעולם לא נכנס לפרודקשן** — ועם זאת מוגדר במאמר "אבן דרך פנימית".
* **פרק 3 · Firehose 1.1 (2006, §3.1, איורים 4–5):**
  * *מבנה:* הוצאת השבבים מהשרתים למארז ייעודי (6 כרטיסי קו + מחשב בקרה קטן במארז), 48 שרתים ל-`ToR`, עדיין 10 Tbps — הפריסה הראשונה בפרודקשן.
  * *דיון ראשי:* איך מפעילים רשת חדשה ולא מוכחת תחת חיפוש ומודעות? ← פריסה לצד הרשת הישנה (`bag-on-the-side`) עם `Big Red Button` שמנתק את הקישורים החדשים ומחזיר ל-4×1G הישנים.
  * *בתוך הבלוקים (איור 4) ושתי שאלות הדיון המוטמעות:*
    * **למה ה-Aggregation עדיין מסומן כחוסם `(B)` למרות שיש לו 32 פורטים למעלה ו-32 למטה?** לכל כרטיס קו יש שבב 8×10G (4 פורטים למעלה, 4 למטה), ולכן מול 8 כרטיסים בשורה הנגדית כל כרטיס יכול להתחבר רק ל-4 מהם (ולא all-to-all).
      * *רמז לשבירת שתיקה:* "תספרו כמה קווים יוצאים מריבוע אחד בשורה העליונה — וכמה ריבועים יש בשורה התחתונה."
    * **למה זוג `Buddied ToRs` מחובר ל-4 כרטיסים שונים (2 לכל ToR + שני קישורי צד 2×10G ביניהם)?** כדי שכרטיס קו תקול אחד לא יוכל לנתק אף `ToR` ובטח שלא לבודד את הזוג כולו.
  * *המגבלה:* היעדר `backplane` — כל חיבור היה כבל נחושת חיצוני והפריסה בשטח הייתה קשה.
* **פרק 4 · Watchtower (2008, §3.2, איור 6):**
  * *מבנה:* שבבי 16×10G איפשרו מארז מתג מסורתי עם `backplane` וכבילת סיבים אופטיים קלה בהרבה, 82 Tbps bisection. *בתוך הבלוקים:* כל שלד בלוק `Spine` הוא מארז 128×10G מ-8 כרטיסי קו × 3 שבבים (2 שבבי קצה + שבב אמצע), קישוריות מלאה על גבי ה-backplane ולכן לא-חוסם (`NB`). ב-`Aggregation`: 4 מארזים כאלה (`NB`).
  * *דיון:* Firehose 1.1 עבד — האם קושי בכבילה ודרישת רוחב-פס גבוהה יותר של שרתים מרובי-ליבות מצדיקים החלפת דור?
* **פרק 5 · Saturn (2009, §3.2, איור 7):**
  * *מבנה:* שבבי 24×10G, מארז 288×10G (12 כרטיסים × 3 שבבים, `NB`) ומתג `Pluto ToR` משבב יחיד, 207 Tbps. לראשונה שרתים יכולים לפרוץ בקצב `10 Gb/s` (ממוצע 2G עם 4×10G למעלה, או 5G עם 8×10G).
  * *דיון המשך:* ממוצע 2 Gb/s ופרץ 10 Gb/s — מדוע הפער הזה מקובל? (תעבורה פרצית — רוב הזמן לא כל השרתים משדרים יחד, אבל זרימה בודדת נהנית ממלוא ה-10G).
* **פרק 6 · Jupiter (2012, §3.3, איורים 8–9):**
  * *מבנה:* שבבי 16×40G (כל פורט פועל כ-40G או 4×10G), פבריק אחיד לכל הדאטה-סנטר (1.3 Pbps, יותר מפי 6 מ-Saturn, מבטל את שכבת ה-inter-cluster). פריסה ושדרוג **במקום (*in situ*)** על חומרה ומהירויות הטרוגניות. מגבלת 64 בלוקי אגרגציה כדי לשמור על זוג קישורי 40G לכל זוג `Spine–Aggregation` לצורך התכנסות מקומית מהירה בתקלת לינק יחיד.
  * *בתוך הבלוקים:* יחידת הבסיס היא מארז `Centauri` (4RU, 2 כרטיסי קו × 2 שבבים, ללא `backplane` — הכול כבלים בחזית, כולל כבלי MPO של 24 סיבים). `Spine` = 6 Centauris (8 שבבים עליונים, 16 תחתונים, 128×40G מטה). `Aggregation` = 8 `Middle Blocks`, שכל אחד מהם בנוי מ-4 Centauris ("רשת דו-שלבית חוסמת" `(B)`: 64×40G למעלה, 256×10G למטה ל-32 ה-ToRs).
  * *שאלת גשר לקטע הבא:* *"חומרה ומהירויות הטרוגניות" — איזו הנחה של Fat-Tree מיחידה 1 נשברה כאן?* (פותח את כרטיס 1 ב-[`Theory vs practice`](https://shaygol.github.io/data-centers-and-ai-networks/lesson.html#practice)).
* **שאלת סיכום לדורות:** *"לאורך חמישה דורות ועשר שנים, אילו שלושה עקרונות ארכיטקטוניים לא השתנו מעולם?"* (שבבים מסחריים, טופולוגיית Clos רב-שלבית, ובקרה מרכזית מחוץ לפס).

### 0:25–0:43 · קטע 4: תיאוריה מול פרקטיקה (טאב [`Theory vs practice`](https://shaygol.github.io/data-centers-and-ai-networks/lesson.html#practice))
* **משפט מעבר לכניסה לבלוק:** *"ב-Jupiter נשברה ההנחה שכל המתגים זהים. אילו עוד הנחות של ה-Fat-Tree מיחידה 1 נשברות כשבונים אותו במציאות?"*
* **שאלת הדיון:** *"ביחידה 1 ה-Fat-Tree נראה מושלם על הנייר. אילו מההנחות שלו נשברות כשגוגל בונה אותו במציאות?"*
* **רמז לשבירת שתיקה:** *"תחשבו על מה שקרה לכם במשחק בבית, או על אובדן חבילות ב-25% — איפה המודל מהלוח שיקר לנו?"*
* **קטע הקריאה המוטמע (§1):** יתרונות ה-Clos (סקייל כמעט שרירותי, גמישות לתקלות, שבבים בעלי radix נמוך) מול המגבלות במציאות (פריסת הסיבים וניהול ריבוי נתיבים שווי-עלות).
* **תשעת הפערים — לפתוח כל כרטיס בהתאם למה שהסטודנטים מעלים (קפיצה ל-[`Clos failures`](https://shaygol.github.io/data-centers-and-ai-networks/lesson.html#clos) / [`Congestion`](https://shaygol.github.io/data-centers-and-ai-networks/lesson.html#congestion) רק אם השעון לפני 0:38):**
  1. **בתיאוריה: כל מתג הוא אותו מתג `k`-port** ← *בפרקטיקה:* דורות של חומרה ומהירויות שונות חולקים את אותו פבריק בשדרוג *in situ* (§3.3, טבלה 2; וגם *Jupiter Evolving* 2022).
  2. **בתיאוריה: כל העץ נבנה בבת אחת ובגודל מלא** ← *בפרקטיקה:* הפבריק גדל ומשתדרג הדרגתית בזמן ששרתים רצים עליו (מ-Firehose 1.1 עד Jupiter, §3.1, §3.3).
  3. **בתיאוריה: רוחב-פס מלא ללא חסימה** ← *בפרקטיקה:* חסימת-יתר מכוונת (`oversubscription`) לחיסכון בעלויות, למשל בקישורי ה-`ToR` (§6.1 iii).
  4. **בתיאוריה: כל כבל נמצא איפה שהתוכנית אומרת** ← *בפרקטיקה:* באלפי כבלים נוצרות שגיאות חיווט, כבלים מוחזרים לא נכון אחרי תחזוקה ויש תקלות חד-כיווניות (§5.2 — משחק שיעורי הבית).
  5. **בתיאוריה: כבלים הם קווים בחינם בשרטוט** ← *בפרקטיקה:* אילוצי הכבילה דחפו החלפת דורות שלמים מ-Firehose 1.1 והלאה (§1, §3.2).
  6. **בתיאוריה: ECMP מפזר זרימות באופן שווה על כל המסלולים** ← *בפרקטיקה:* פיזור ה-hash אינו מושלם, במיוחד בתקלות ועם שונות בנפחי זרימות; אובדן חבילות מתחיל כבר ב-25% ניצולת ממוצעת (§6.1 iv). *(אופציונלי: כפתור קפיצה ל-[`Clos failures`](https://shaygol.github.io/data-centers-and-ai-networks/lesson.html#clos)).*
  7. **בתיאוריה: למתגים יש באפר אידיאלי לכל פרץ** ← *בפרקטיקה:* לשבבים מסחריים זולים יש באפרים רדודים שאינם מתאימים לעומסי `incast` ו-`outcast` של מחסנית ה-TCP בשרתים (§6.1 i–ii; בין הפתרונות: חלון TCP חסום, `ECN`, שיתוף באפרים דינמי). *(אופציונלי: כפתור קפיצה ל-[`Congestion`](https://shaygol.github.io/data-centers-and-ai-networks/lesson.html#congestion)).*
  8. **בתיאוריה: ניתוב עובד מיידית וללא עלות** ← *בפרקטיקה:* המעבדים הקטנים של המתגים לא עמדו בעומס של אתחול פבריק מלא (§6.2 — מכין את הסיפור משעה 1).
  9. **בתיאוריה: כדי לגדול פשוט בוחרים `k` גדול יותר** ← *בפרקטיקה:* קנה המידה מוגבל בפועל על-ידי גודל תחומי התקלה ויכולת ההרחבה של מישור הבקרה (§1).
* **נקודת עצירה (0:43):** סוגרים את [`Theory vs practice`](https://shaygol.github.io/data-centers-and-ai-networks/lesson.html#practice) ועוברים לסיכום בעל-פה.

### 0:43–0:50 · סיכום ומעבר ליחידה 4 (ללא שקף ייעודי במצגת)
* **סבב כיתתי מהיר (משפט אחד לסטודנט):** *"במשפט אחד — מה גוגל Jupiter הוסיף לרעיון התיאורטי של Clos / Fat-Tree?"*
* **סיכום וגשר ליחידה 4:**
  * Jupiter הוכיח שאפשר לבנות דאטה-סנטר עצום משבבים מסחריים ובקרה מרכזית אמינה.
  * עם זאת, ראינו שבלי שינוי של מנגנוני התעבורה, ECMP סטטי ובאפרים רדודים עדיין גורמים לאובדן חבילות כבר ב-25% עומס ממוצע.
  * **בשבוע הבא (יחידה 4):** ניתוב אדפטיבי ואיזון עומסים מבוסס-עומס (`WCMP`, `FlowBender`, `CONGA`) ובקרת גודש ייעודית לדאטה-סנטר (`DCTCP`, `TIMELY`).

---

## בלוקי רזרבה (רק אם נשאר זמן)

* **טאב [`Clos failures`](https://shaygol.github.io/data-centers-and-ai-networks/lesson.html#clos) (§1, §5.2):** מעבדת Clos קטנה עם 2 מתגי אגרגציה × 2 קישורי מעלה = 4 מסלולים שווי-עלות בין `T1` ל-`T7`. השוואת מצב תקין מול נפילת `Spine` (כמה קיבולת מאבדים?) ונפילת לינק בודד (הדגמת הפגיעה באיזון של ECMP).
* **טאב [`Congestion`](https://shaygol.github.io/data-centers-and-ai-networks/lesson.html#congestion) (§6.1):** סימולציית פרץ קצר על פורט שקט עם ניצולת ממוצעת נמוכה שגורמת לגלישת הבאפר ולאובדן חבילות, לעומת הפעלת שלושת הפתרונות שבמעבדה — `ECN`, חלון גודש חסום (`Bounded congestion window`), ושיתוף באפרים דינמי (`Dynamic buffer sharing`) — שמאפסים את האובדן במחיר התארכות משך הזמן לסיום הפרץ.
* **טאב [`RNG`](https://shaygol.github.io/data-centers-and-ai-networks/lesson.html#rng):** מקום שמור במצגת לדיון המשך על רשתות שטוחות בקנה מידה גדול ([*Bernardi et al., arXiv 2026*](https://github.com/shaygol/data-centers-and-ai-networks/blob/main/articles/RNG%20-%20Flat%20Datacenter%20Networks%20at%20Scale.pdf)).

---

## פרוטוקול קיצור חירום (ניהול זמן)

אם נכנסים לפיגור בלוח הזמנים, יש לקצץ בסדר העדיפויות הבא:
1. **קיצוץ ראשון:** לדלג על הקפיצות מ-[`Theory vs practice`](https://shaygol.github.io/data-centers-and-ai-networks/lesson.html#practice) אל מעבדות הרזרבה [`Clos failures`](https://shaygol.github.io/data-centers-and-ai-networks/lesson.html#clos) ו-[`Congestion`](https://shaygol.github.io/data-centers-and-ai-networks/lesson.html#congestion) ולהסתפק בדוגמאות ובציטוטים שבתוך הכרטיסים (חוסך ~5 דק').
2. **קיצוץ שני:** לעבור במהירות על `Watchtower` ו-`Saturn` בטאב [`Generations`](https://shaygol.github.io/data-centers-and-ai-networks/lesson.html#generations~legacy) ולהתמקד בקפיצה מ-Firehose 1.0/1.1 ל-`Jupiter` (חוסך ~4 דק').
3. **קיצוץ שלישי:** להסתפק בדיאגרמת הפנים-בלוקים של `Firehose 1.1` ולוותר על פירוט `Data table` המלא ב-[`Traffic`](https://shaygol.github.io/data-centers-and-ai-networks/lesson.html#traffic) (חוסך ~3 דק').
4. **לא לקצץ:** תחקיר `Miswire Hunt` והכרעת שאלה 3, הרמזים של [`Why OpenFlow`](https://shaygol.github.io/data-centers-and-ai-networks/lesson.html#openflow), איור הפנים של `Firehose 1.1` (חוסם מול אי-חוסם ושרידות), ו-9 הפערים שבין תיאוריה לפרקטיקה.

---

## נספח למרצה — מפתח המשחק ושיבוץ שכבות ה-SDN

### מפתח 5 התקלות במשחק `Miswire Hunt` (לפי [`puzzle.js`](https://github.com/shaygol/data-centers-and-ai-networks/blob/main/exercises/ex3/site/public/js/puzzle.js) ו-[`instructor.html`](https://shaygol.github.io/data-centers-and-ai-networks/instructor.html))

<table dir="rtl" align="right" style="direction: rtl; text-align: right;">
  <thead>
    <tr>
      <th align="right">#</th>
      <th align="right">שם התקלה במשחק</th>
      <th align="right">פורטים וציוד מושפעים</th>
      <th align="right">אבחון נדרש</th>
      <th align="right">הסבר ומנגנון (§5.2.1)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td align="right"><strong>1</strong></td>
      <td align="right"><strong>החלפת כבלים ב-<code>AG3</code></strong></td>
      <td align="right"><code>AG3:d1 ↔ T6:p1</code><br><code>AG3:d2 ↔ T5:p1</code></td>
      <td align="right"><code>MISWIRED</code> בכל 4 הפורטים</td>
      <td align="right">לאחר עבודת כרטיס קו ב-<code>AG3</code>, הכבלים ב-<code>d1</code> ו-<code>d2</code> הוצלבו. <code>ND</code> משווה את מזהה השכן ל-<code>Cluster Config</code>, מזהה אי-התאמה ומוציא את הלינקים מהניתוב.</td>
    </tr>
    <tr>
      <td align="right"><strong>2</strong></td>
      <td align="right"><strong>כבל של <code>T4</code> חובר לבלוק הלא נכון</strong></td>
      <td align="right"><code>T4:p2 ↔ AG4:d4</code><br><code>T8:p2</code>, <code>AG2:d4</code> (ללא כבל)</td>
      <td align="right"><code>MISWIRED</code> ב-<code>T4:p2</code> ו-<code>AG4:d4</code>;<br><code>LINK_DOWN</code> ב-<code>T8:p2</code> ו-<code>AG2:d4</code></td>
      <td align="right"><code>T4:p2</code> שנועד ל-<code>AG2:d4</code> חובר ל-<code>AG4:d4</code> בבלוק האגרגציה השני, והשאיר את <code>T8:p2</code> ואת <code>AG2:d4</code> מנותקים (<code>PHY DOWN</code>). ללא <code>ND</code>, כבל שגוי כזה היה עלול ליצור לולאת ניתוב.</td>
    </tr>
    <tr>
      <td align="right"><strong>3</strong></td>
      <td align="right"><strong>לינק חד-כיווני</strong></td>
      <td align="right"><code>SP3:p3 ↔ AG3:u3</code></td>
      <td align="right"><code>ONE_WAY</code> ב-<code>AG3:u3</code>;<br><code>PEER_SILENT</code> או <code>ONE_WAY</code> ב-<code>SP3:p3</code></td>
      <td align="right">אור עובר מ-<code>SP3</code> ל-<code>AG3</code> אבל לא בכיוון ההפוך. מ-<code>SP3</code> לבדו זה נראה כשכן שותק; רק בדיקת שני הקצוות מגלה תקלה חד-כיוונית.</td>
    </tr>
    <tr>
      <td align="right"><strong>4</strong></td>
      <td align="right"><strong>שיעור שגיאות גבוה</strong></td>
      <td align="right"><code>SP1:p2 ↔ AG2:u1</code></td>
      <td align="right"><code>HIGH_ERRORS</code> בשני הקצוות</td>
      <td align="right">הלינק פעיל ומחובר כנדרש, אך שיעור השגיאות עומד על <code>3.1e-4</code>. המאמר מציין שיש להימנע מלינק כזה ולתזמן החלפה כדי למנוע פגיעה שקטה ב-TCP.</td>
    </tr>
    <tr>
      <td align="right"><strong>5</strong></td>
      <td align="right"><strong>קריסת תוכנה ב-<code>T7</code></strong></td>
      <td align="right"><code>AG3:d3</code>, <code>AG4:d3</code> (מול <code>T7</code>)</td>
      <td align="right"><code>PEER_SILENT</code> בשני הפורטים</td>
      <td align="right">שני הפורטים מראים <code>PHY UP</code> ללא הודעות <code>ND</code>. <code>PHY UP</code> שולל ניתוק כבלים או נפילת חשמל — התוכנה ב-<code>T7</code> קרסה ו-<code>ND</code> מתפקד כ-keepalive המדווח על הנפילה.</td>
    </tr>
  </tbody>
</table>

* **מפתח שאלות הסיבה השורשית בשלב 4 במשחק:** שאלה 1 (פורטים מול `T7`) ← **קריסת תוכנה ב-`T7`**; שאלה 2 (`SP3 p3` מול `AG3 u3`) ← **לינק חד-כיווני**.

### מפת שיבוץ 8 הרכיבים לשכבות SDN (חלק ג', לפי [`instructor.html`](https://shaygol.github.io/data-centers-and-ai-networks/instructor.html))

<table dir="rtl" align="right" style="direction: rtl; text-align: right;">
  <thead>
    <tr>
      <th align="right">#</th>
      <th align="right">רכיב</th>
      <th align="right">סיווג מקובל</th>
      <th align="right">נקודת דיון לכיתה</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td align="right"><strong>1</strong></td>
      <td align="right"><code>Firepath master</code></td>
      <td align="right">מישור בקרה (<code>Control</code>)</td>
      <td align="right">מאסף ומפיץ <code>LSD</code> גלובלי, אך בניגוד ל-OpenFlow אינו מחשב בעצמו את טבלאות הניתוב.</td>
    </tr>
    <tr>
      <td align="right"><strong>2</strong></td>
      <td align="right"><code>Firepath client</code></td>
      <td align="right">מישור בקרה (<code>Control</code>)</td>
      <td align="right">רץ על כל מתג, מדווח מצב מקומי ומחשב את מסלולי ה-ECMP מה-<code>LSD</code>.</td>
    </tr>
    <tr>
      <td align="right"><strong>3</strong></td>
      <td align="right"><code>Link State Database (LSD)</code></td>
      <td align="right">מישור בקרה (<code>Control</code>)</td>
      <td align="right">מצב הטופולוגיה הדינמי והממוספר המופץ לכל המתגים (~64 KB).</td>
    </tr>
    <tr>
      <td align="right"><strong>4</strong></td>
      <td align="right"><code>Control Plane Network (CPN)</code></td>
      <td align="right">מחוץ לתמונת SDN / תשתית תומכת (או בקרה/ניהול)</td>
      <td align="right">רשת פיזית נפרדת מחוץ לפס שנושאת את תעבורת הבקרה והניהול — מקור קבוע לחוסר הסכמה מעניין בכיתה.</td>
    </tr>
    <tr>
      <td align="right"><strong>5</strong></td>
      <td align="right"><code>Neighbor Discovery (ND)</code></td>
      <td align="right">מישור בקרה (<code>Control</code>)</td>
      <td align="right">גם מאמת חיווט מול ה-<code>Cluster Config</code> וגם משמש כ-keepalive דינמי של הלינק.</td>
    </tr>
    <tr>
      <td align="right"><strong>6</strong></td>
      <td align="right"><code>BGP at the CBRs</code></td>
      <td align="right">מישור בקרה (<code>Control</code>)</td>
      <td align="right">ניתוב BGP בקצוות הפבריק המופץ פנימה לתוך Firepath (§5.2).</td>
    </tr>
    <tr>
      <td align="right"><strong>7</strong></td>
      <td align="right"><code>Cluster config</code></td>
      <td align="right">מישור ניהול (<code>Management</code>)</td>
      <td align="right">כוונת הטופולוגיה הסטטית וההצהרתית הנטענת מראש באתחול, לא מצב דינמי בזמן ריצה.</td>
    </tr>
    <tr>
      <td align="right"><strong>8</strong></td>
      <td align="right"><code>Forwarding table</code></td>
      <td align="right">מישור נתונים (<code>Data</code>)</td>
      <td align="right">טבלת ה-FIB בחומרת המתג שעל פיה נבדקת ומועברת כל חבילה.</td>
    </tr>
  </tbody>
</table>

</div>
