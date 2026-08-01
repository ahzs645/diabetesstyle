/**
 * Bilingual labels for the LibreView-style report. Arabic strings are taken
 * verbatim from the printed Arabic report; English strings from the printed
 * English report of the same product.
 */

export type ReportLang = "ar" | "en";

const dict = {
  appTitle: { ar: "ليبري ڤيو", en: "LibreView" },
  // report names
  agpReport: { ar: "ملف تغير الجلوكوز (AGP)", en: "AGP Report" },
  patternInsights: { ar: "تأملات نمط الجلوكوز", en: "Glucose Pattern Insights" },
  snapshot: { ar: "لقطة", en: "Snapshot" },
  dailyLog: { ar: "السجل اليومي", en: "Daily Log" },
  weeklySummary: { ar: "الملخص الأسبوعي", en: "Weekly Summary" },
  monthlySummary: { ar: "الملخص الشهري", en: "Monthly Summary" },
  mealtimePatterns: { ar: "أنماط أوقات الوجبات", en: "Mealtime Patterns" },
  dailyPatterns: { ar: "الأنماط اليومية", en: "Daily Patterns" },
  deviceDetails: { ar: "تفاصيل الجهاز", en: "Device Details" },
  estimatedA1c: { ar: "A1C المقدّر", en: "Estimated A1C" },
  // shared
  days: { ar: "الأيام", en: "Days" },
  generated: { ar: "الإنشاء", en: "Generated" },
  page: { ar: "صفحة", en: "PAGE" },
  dob: { ar: "تاريخ الميلاد", en: "DOB" },
  mrn: { ar: "رقم السجل الطبي (MRN)", en: "MRN" },
  device: { ar: "الجهاز", en: "DEVICE" },
  sources: { ar: "مصادر", en: "SOURCES" },
  mgdl: { ar: "ملجم/ديسيلتر", en: "mg/dL" },
  mmolL: { ar: "ملمول/لتر", en: "mmol/L" },
  mmolMol: { ar: "ملمول/مول", en: "mmol/mol" },
  unit: { ar: "الوحدة", en: "Unit" },
  gramsPerDay: { ar: "جرام/يوم", en: "grams/day" },
  unitsPerDay: { ar: "وحدة/يوم", en: "units/day" },
  perDay: { ar: "اليوم", en: "Day" },
  minutes: { ar: "دقيقة", en: "Min" },
  hourShort: { ar: "س", en: "h" },
  minShort: { ar: "د", en: "min" },
  // AGP report
  glucoseStatsAndTargets: {
    ar: "إحصاءات معدل الجلوكوز والقيم المستهدفة",
    en: "GLUCOSE STATISTICS AND TARGETS",
  },
  timeInRanges: { ar: "الوقت في الحدود", en: "TIME IN RANGES" },
  timeSensorActive: { ar: "وقت تنشيط المجس", en: "Time Sensor Active" },
  rangesTargetsFor: {
    ar: "الحدود والقيم المستهدفة لـ",
    en: "Ranges And Targets For",
  },
  diabetesType: {
    ar: "مرض السكري من النوع 1 أو النوع 2",
    en: "Type 1 or Type 2 Diabetes",
  },
  glucoseRanges: { ar: "حدود الجلوكوز في الدم", en: "Glucose Ranges" },
  targetsPctReadings: {
    ar: "القيم المستهدفة % من القراءات (الوقت/اليوم)",
    en: "Targets % of Readings (Time/Day)",
  },
  targetRangeLabel: { ar: "النطاق المستهدف", en: "Target Range" },
  // {v} = threshold value, {u} = glucose unit label
  belowThreshold: { ar: "أقل من {v} {u}", en: "Below {v} {u}" },
  aboveThreshold: { ar: "أعلى {v} {u}", en: "Above {v} {u}" },
  greaterThan: { ar: "أكبر من", en: "Greater than" },
  lessThan: { ar: "أقل من", en: "Less than" },
  tirBenefit: {
    ar: "كل زيادة في الوقت بمقدار %5 في حدود ({lo}-{hi} {u}) تكون مفيدة طبيًا.",
    en: "Each 5% increase in time in range ({lo}-{hi} {u}) is clinically beneficial.",
  },
  averageGlucose: { ar: "متوسط الجلوكوز", en: "Average Glucose" },
  gmi: { ar: "مؤشر إدارة الجلوكوز (GMI)", en: "Glucose Management Indicator (GMI)" },
  glucoseVariability: { ar: "التغير في نسبة الجلوكوز بالدم", en: "Glucose Variability" },
  cvDefinition: {
    ar: "؛ يُعرّف بأنه معامل التباين بالنسبة المئوية (CV%)؛ الهدف ≥36%",
    en: "Defined as percent coefficient of variation (%CV); target ≤36%",
  },
  veryHigh: { ar: "مرتفع للغاية", en: "Very High" },
  high: { ar: "مرتفع", en: "High" },
  targetRange: { ar: "النطاق المستهدف", en: "Target Range" },
  low: { ar: "منخفض", en: "Low" },
  veryLow: { ar: "منخفض للغاية", en: "Very Low" },
  agpSectionTitle: { ar: "الملف المتنقل عن الجلوكوز (AGP)", en: "AMBULATORY GLUCOSE PROFILE (AGP)" },
  agpExplainer: {
    ar: "الملف المتنقل عن الجلوكوز هو ملخص لقيم الجلوكوز من فترة التقرير، مع عرض الوسيط (50%) والنسب المئوية الأخرى كما لو كانت تحدث في يوم واحد.",
    en: "AGP is a summary of glucose values from the report period, with median (50%) and other percentiles shown as if occurring in a single day.",
  },
  dailyGlucoseProfiles: { ar: "ملفات الجلوكوز اليومية", en: "DAILY GLUCOSE PROFILES" },
  dailyProfilesExplainer: {
    ar: "يمثل كل ملف يومي فترة ما بين منتصف الليل إلى منتصف الليل التالي مع عرض التاريخ في الزاوية العلوية اليسرى.",
    en: "Each daily profile represents a midnight-to-midnight period with the date displayed in the upper left corner.",
  },
  // pattern insights
  selectedDates: { ar: "التواريخ المحددة", en: "Selected Dates" },
  timeInBands: { ar: "الوقت في النطاقات", en: "Time In Ranges" },
  glucoseStats: { ar: "إحصائيات الجلوكوز", en: "Glucose Statistics" },
  goal: { ar: "الهدف", en: "Goal" },
  target: { ar: "الهدف", en: "Target" },
  gmiApprox: {
    ar: "التقريبي بناءً على متوسط مستوى الجلوكوز من CGM.",
    en: "Approximate A1C level based on average CGM glucose level.",
  },
  a1cLevel: { ar: "مستوى A1C", en: "A1C level" },
  considerationsForDoctor: { ar: "اعتبارات للطبيب¹", en: "Considerations for Provider¹" },
  mostImportantPattern: { ar: "النمط الأكثر أهمية:", en: "Most important pattern:" },
  noHarmfulPatterns: {
    ar: "لم يتم اكتشاف أنماط جلوكوز ضارة",
    en: "No harmful glucose patterns detected",
  },
  lowsDetectedPattern: {
    ar: "تم اكتشاف حالات انخفاض الجلوكوز",
    en: "Low glucose patterns detected",
  },
  considerationsFootnote: {
    ar: "1. الاعتبارات المقترحة لا تحل محل رأي أو نصيحة مقدم الرعاية الصحية.",
    en: "1. Suggested considerations do not replace the opinion or advice of the healthcare provider.",
  },
  glucosePatterns: { ar: "أنماط الجلوكوز", en: "Glucose Patterns" },
  devicesLabel: { ar: "الجهاز (الأجهزة)", en: "Device(s)" },
  // snapshot
  glucose: { ar: "الجلوكوز", en: "Glucose" },
  aboveTarget: { ar: "أعلى من الهدف", en: "above target" },
  inTarget: { ar: "في الهدف", en: "in target" },
  belowTarget: { ar: "أدنى من الهدف", en: "below target" },
  lowGlucoseEvents: { ar: "حالات انخفاض الجلوكوز", en: "Low Glucose Events" },
  averageDuration: { ar: "متوسط المدة", en: "Average duration" },
  sensorUsage: { ar: "استخدام المجس", en: "Sensor Usage" },
  pctTimeActive: { ar: "مستشعر الوقت نشط %", en: "% Time Sensor is Active" },
  avgScansViews: { ar: "متوسط الفحوصات/العروض", en: "Average scans/views" },
  median: { ar: "الوسيط", en: "Median" },
  p5to95: { ar: "النسب المئوية من 5 إلى 95", en: "5th to 95th Percentiles" },
  p25to75: { ar: "القيمة المئوية لـ 25 إلى الـ 75", en: "25th to 75th Percentile" },
  carbs: { ar: "الكربوهيدرات", en: "Carbs" },
  dailyCarbs: { ar: "الكربوهيدرات اليومية", en: "DAILY CARBS" },
  insulin: { ar: "الأنسولين", en: "Insulin" },
  rapidActingInsulin: { ar: "الإنسولين سريع المفعول", en: "RAPID-ACTING INSULIN" },
  longActingInsulin: { ar: "الإنسولين طويل المفعول", en: "LONG-ACTING INSULIN" },
  totalDailyInsulin: { ar: "إجمالي الأنسولين اليومي", en: "Total Daily Insulin" },
  comments: { ar: "تعليقات", en: "Comments" },
  insulinGapComment: {
    ar: "تم العثور على فجوات في بيانات الأنسولين. هناك {n} يومًا في فترة التقرير هذه لا تحتوي على حالات أنسولين مسجلة.",
    en: "Gaps found in the insulin data. {n} days in this reporting period have no recorded insulin events.",
  },
  foodGapComment: {
    ar: "تم العثور على فجوات في بيانات الطعام. هناك {n} يومًا في فترة التقرير هذه لا تحتوي على حالات طعام مسجلة.",
    en: "Gaps found in food data. {n} days in this reporting period have no recorded food events.",
  },
  // daily log & weekly
  maxLabel: { ar: "الحد الأقصى", en: "Max" },
  minLabel: { ar: "الحد الأدنى", en: "Min" },
  legend: { ar: "السرد", en: "Legend" },
  highGlucoseLegend: { ar: "جلوكوز مرتفع (<{v})", en: "High Glucose (>{v})" },
  lowGlucoseLegend: { ar: "جلوكوز منخفض (>{v})", en: "Low Glucose (<{v})" },
  scansViews: { ar: "الفحوصات/ العروض", en: "Scans/Views" },
  logged: { ar: "مسجل", en: "Logged" },
  postMealPeak: { ar: "ذروة بعد الوجبة", en: "Post-Meal Peak" },
  newSensor: { ar: "مجس جديد", en: "New Sensor" },
  timeChange: { ar: "تغيير الوقت", en: "Time Change" },
  stripTest: { ar: "شريط اختبار", en: "Strip Test" },
  insulinFormula: {
    ar: "الوجبة + التصحيح + تغيير المستخدم = المجموع",
    en: "Meal + Correction + User Change = Total",
  },
  totalCarbs: { ar: "إجمالي الكربوهيدرات", en: "Total Carbs" },
  lowsCount: { ar: "حالات الانخفاض", en: "Lows" },
  // monthly
  avgGlucoseLegend: { ar: "متوسط الجلوكوز", en: "Average Glucose" },
  lowGlucoseEventsLegend: { ar: "حالات الجلوكوز المنخفض", en: "Low Glucose Events" },
  // mealtime
  morning: { ar: "الصباح", en: "Morning" },
  midday: { ar: "الظهيرة", en: "Midday" },
  evening: { ar: "المساء", en: "Evening" },
  night: { ar: "الليل", en: "Night" },
  preMeal: { ar: "قبل الوجبة", en: "Pre-meal" },
  postMeal: { ar: "بعد الوجبة", en: "Post-meal" },
  hourBefore: { ar: "ساعة-1", en: "-1hr" },
  daily: { ar: "اليومي", en: "AVERAGE" },
  prePostAverages: { ar: "المتوسط قبل الوجبة وبعد", en: "Pre & Post-meal Averages" },
  glucoseReading: { ar: "قراءة نسبة الجلوكوز", en: "Glucose Reading" },
  glucoseAbove350: { ar: "نسبة الجلوكوز أعلى من {v}", en: "Glucose Above {v}" },
  // daily patterns
  dailyAverage: { ar: "المتوسط اليومي", en: "Daily Average" },
  gramsUnit: { ar: "جرام", en: "grams" },
  // estimated A1C
  a1cBasedOn: {
    ar: "استنادًا إلى {n} قراءة تلقائية خلال {d} من الأيام",
    en: "Based on {n} automatic readings over {d} days",
  },
  a1cEquationsTitle: { ar: "المعادلات", en: "The Equations" },
  a1cMathTitle: {
    ar: "كيف تُحسب هذه القيمة؟ (المعادلات والحساب)",
    en: "How is this value calculated? (equations & math)",
  },
  a1cEqAdagTitle: {
    ar: "من متوسط الجلوكوز إلى A1C المقدّر (معادلة ADAG)",
    en: "Mean glucose → estimated A1C (ADAG equation)",
  },
  a1cEqAdagNote: {
    ar: "معادلة انحدار من دراسة ADAG (‏Nathan وآخرون، 2008) تربط متوسط الجلوكوز بقيمة A1C المخبرية. تستخدم القراءات التلقائية (كل 15 دقيقة) فقط — قراءات المسح اليدوية لا تدخل في الحساب.",
    en: "A regression from the ADAG study (Nathan et al., 2008) linking mean glucose to laboratory A1C. Only automatic 15-minute readings are used — manual scans are excluded.",
  },
  a1cEqIfccTitle: {
    ar: "التحويل إلى ملمول/مول (IFCC)",
    en: "Conversion to mmol/mol (IFCC)",
  },
  a1cEqIfccNote: {
    ar: "المعادلة الرئيسية للتحويل من نسبة NGSP المئوية إلى وحدات IFCC، وهي القيمة المعروضة بين قوسين في التطبيق.",
    en: "The NGSP↔IFCC master equation converting the percentage into IFCC units — the value shown in parentheses in the app.",
  },
  a1cEqGmiNote: {
    ar: "معادلة أحدث (‏Bergenstal وآخرون، 2018) تُستخدم في تقارير AGP بدلاً من A1C المقدّر، وتعطي نتيجة قريبة لكنها ليست مطابقة.",
    en: "A newer regression (Bergenstal et al., 2018) used on AGP reports instead of estimated A1C; it gives a similar but not identical result.",
  },
  a1cStepsTitle: {
    ar: "الحساب خطوة بخطوة على بياناتك",
    en: "Step-by-step on your data",
  },
  a1cStep1: {
    ar: "جمع القراءات: {n} قراءة تلقائية (كل 15 دقيقة) في الفترة المحددة؛ تُستبعد قراءات المسح ({s} قراءة).",
    en: "Collect the readings: {n} automatic 15-minute readings in the selected period; the {s} manual scans are excluded.",
  },
  a1cStep2: {
    ar: "حساب المتوسط الحسابي البسيط لكل القراءات:",
    en: "Take the plain arithmetic mean of all those readings:",
  },
  a1cStep3: {
    ar: "تطبيق معادلة ADAG على المتوسط:",
    en: "Apply the ADAG equation to the mean:",
  },
  a1cStep4: {
    ar: "التقريب إلى منزلة عشرية واحدة، ثم التحويل إلى وحدات IFCC وتقريبها إلى عدد صحيح:",
    en: "Round to one decimal, then convert to IFCC units and round to a whole number:",
  },
  a1cNoData: {
    ar: "لا توجد قراءات تلقائية في الفترة المحددة.",
    en: "No automatic readings in the selected period.",
  },
  a1cChartDailyTitle: {
    ar: "متوسط الجلوكوز اليومي في فترة التقرير",
    en: "Daily average glucose over the report period",
  },
  a1cChartCumulativeTitle: {
    ar: "كيف تتراكم القيمة عبر فترة التقرير",
    en: "How the value builds up over the report period",
  },
  a1cChartCumulativeNote: {
    ar: "كل نقطة تمثل A1C المقدّر المحسوب من جميع القراءات منذ بداية الفترة وحتى ذلك اليوم — أي القيمة التي كانت ستظهر لو توقفت البيانات عند ذلك اليوم.",
    en: "Each point is the estimated A1C computed from every reading between the start of the period and that day — the value you would have seen if the data stopped there.",
  },
  a1cChartTrendTitle: {
    ar: "تطور A1C المقدّر عبر مجموعة البيانات كاملة",
    en: "Estimated A1C across the whole dataset",
  },
  a1cChartTrendNote: {
    ar: "لكل يوم، A1C المقدّر من القراءات في النافذة المنتهية بذلك اليوم. المنطقة المظللة هي فترة التقرير المحددة.",
    en: "For each day, the estimated A1C of the readings in the trailing window ending on that day. The shaded band is the selected report period.",
  },
  a1cTrailingWindow: { ar: "نافذة الحساب", en: "Rolling window" },
  a1cReadingsUsed: { ar: "قراءة مستخدمة", en: "readings used" },
  a1cMeanShort: { ar: "المتوسط", en: "Mean" },
  a1cResultWord: { ar: "النتيجة", en: "Result" },
  // data sources / separate-source mode
  dataSources: { ar: "مصادر البيانات", en: "Data Sources" },
  source: { ar: "المصدر", en: "Source" },
  allSources: { ar: "كل المصادر (مدمجة)", en: "All sources (merged)" },
  srcExplainer: {
    ar: "يدمج ملف LibreView كل نسخة من التطبيق رفعت بيانات إلى الحساب: هاتف جديد أو إعادة تثبيت أو قارئ ثانٍ يظهر كرقم تسلسلي مستقل. أما تطبيق LibreLink على الهاتف فيحسب شاشاته من قاعدة بياناته المحلية وحدها، فقد يعرض قيمة تختلف كثيرًا عن الملف المدمج بينما يحمل عنوان الفترة نفسها.",
    en: "A LibreView export merges every app instance that ever uploaded to the account: a new phone, a reinstall or a second reader each appear as their own serial number. The LibreLink app on a phone computes its screens from its own local database only, so it can show a value far from the merged export while still being headed with the same report period.",
  },
  srcTimelineTitle: {
    ar: "تغطية كل مصدر عبر مجموعة البيانات",
    en: "Coverage of each source across the dataset",
  },
  srcTimelineNote: {
    ar: "كل شريط يمثل مصدرًا واحدًا، والأيام الملونة هي الأيام التي سجّل فيها قراءات تلقائية. المنطقة المظللة هي فترة التقرير المحددة.",
    en: "Each bar is one source; coloured days are days it recorded automatic readings. The shaded band is the selected report period.",
  },
  srcTableTitle: {
    ar: "ما يعرضه كل مصدر للفترة المحددة",
    en: "What each source shows for the selected period",
  },
  srcTableNote: {
    ar: "الصف الأول هو القيمة المدمجة التي تدعمها بيانات الملف. كل صف بعده هو القيمة التي كان ذلك المصدر وحده سيعرضها للفترة نفسها.",
    en: "The first row is the merged value the export supports. Each row below is the value that source alone would have shown for the same period.",
  },
  srcMergedLabel: { ar: "كل المصادر", en: "All sources" },
  srcColSpan: { ar: "أول وآخر قراءة", en: "First and last reading" },
  srcColDays: { ar: "أيام فيها بيانات", en: "Days with data" },
  srcColReadings: { ar: "القراءات التلقائية", en: "Automatic readings" },
  srcColCoverage: { ar: "تغطية الفترة", en: "Period coverage" },
  srcVsMerged: { ar: "الفرق عن المدمج", en: "vs merged" },
  srcLowCoverage: { ar: "تغطية منخفضة", en: "Low coverage" },
  srcLowCoverageNote: {
    ar: "يغطي هذا المصدر {d} من {t} يومًا في الفترة المحددة، أي {p} من القراءات المتوقعة. المتوسط المحسوب منه وحده لا يمثل الفترة المكتوبة في العنوان.",
    en: "This source covers {d} of {t} days in the selected period — {p} of the expected readings. An average from it alone does not represent the window its heading claims.",
  },
  srcHandoverTitle: { ar: "تبديل المصدر", en: "Source handover" },
  srcHandoverNote: {
    ar: "آخر قراءة من {a} بتاريخ {da}، وأول قراءة من {b} بتاريخ {db}. القراءات التي تسبق هذا التبديل لم تكن موجودة على الجهاز الجديد.",
    en: "Last reading from {a} on {da}, first reading from {b} on {db}. Nothing before that handover existed on the new instance.",
  },
  srcSingle: {
    ar: "يحتوي هذا الملف على مصدر واحد، لذلك تتطابق قيمة التطبيق مع القيمة المدمجة.",
    en: "This export contains a single source, so the app value and the merged value agree.",
  },
  srcFilterBanner: {
    ar: "وضع المصدر المنفصل: كل التقارير تعرض بيانات المصدر {s} وحده.",
    en: "Separate-source mode: every report shows data from source {s} only.",
  },
  srcShowOnly: { ar: "عرض هذا المصدر وحده", en: "Show this source alone" },
  srcShowAll: { ar: "العودة إلى كل المصادر", en: "Back to all sources" },
  srcNoReadings: {
    ar: "لا توجد قراءات تلقائية من هذا المصدر في الفترة المحددة.",
    en: "No automatic readings from this source in the selected period.",
  },
  srcCoverageOfPeriod: {
    ar: "{d} من {t} يومًا · {p} من القراءات المتوقعة",
    en: "{d} of {t} days · {p} of expected readings",
  },
  a1cCoverageWarn: {
    ar: "تستند هذه القيمة إلى {p} فقط من القراءات المتوقعة للفترة ({d} من {t} يومًا فيها بيانات).",
    en: "This value rests on just {p} of the readings expected for the period ({d} of {t} days carry data).",
  },
  // device details
  settings: { ar: "الإعدادات", en: "Settings" },
  devices: { ar: "الأجهزة", en: "Devices" },
  glucoseAlarmSettings: { ar: "إعدادات منبه الجلوكوز", en: "Glucose Alarm Settings" },
  lowGlucoseAlarm: { ar: "الجلوكوز منخفضا", en: "Low Glucose" },
  highGlucoseAlarm: { ar: "الجلوكوز المرتفع", en: "High Glucose" },
  signalLoss: { ar: "فقدان الإشارة", en: "Signal Loss" },
  off: { ar: "إيقاف", en: "Off" },
  notInExport: { ar: "غير متوفر في ملف التصدير", en: "Not available in export file" },
  serialNumber: { ar: "الرقم التسلسلي", en: "Serial Number" },
  // page chrome
  uploadCsv: { ar: "تحميل ملف CSV", en: "Upload CSV" },
  loadFromUrl: { ar: "التحميل من رابط", en: "Load from URL" },
  load: { ar: "تحميل", en: "Load" },
  orWord: { ar: "أو", en: "or" },
  dropCsvHint: {
    ar: "أو اسحب ملف CSV وأفلته في أي مكان على الصفحة.",
    en: "You can also drag & drop a CSV file anywhere on the page.",
  },
  dropCsvHere: { ar: "أفلت ملف CSV هنا", en: "Drop the CSV file here" },
  fetchCsvError: {
    ar: "تعذر تحميل الملف من الرابط",
    en: "Could not load the file from the URL",
  },
  loadSample: { ar: "تحميل البيانات النموذجية", en: "Load sample data" },
  printReport: { ar: "طباعة التقرير", en: "Print report" },
  reportPeriod: { ar: "فترة التقرير", en: "Report period" },
  customPeriod: { ar: "مخصص", en: "Custom" },
  startDate: { ar: "تاريخ البدء", en: "Start date" },
  endDate: { ar: "تاريخ الانتهاء", en: "End date" },
  allReports: { ar: "كل التقارير", en: "All reports" },
  patient: { ar: "المريض", en: "Patient" },
  noData: {
    ar: "لا توجد بيانات في الفترة المحددة.",
    en: "No data in the selected period.",
  },
} as const;

export type LabelKey = keyof typeof dict;

export function makeT(lang: ReportLang) {
  return (key: LabelKey, vars?: Record<string, string | number>): string => {
    let s: string = dict[key][lang];
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        s = s.replace(`{${k}}`, String(v));
      }
    }
    return s;
  };
}

export function formatNumber(
  value: number,
  lang: ReportLang,
  fractionDigits = 0,
): string {
  const fixed = value.toFixed(fractionDigits);
  return lang === "ar" ? fixed.replace(".", ",") : fixed;
}

/** "%90" in Arabic (leading percent, as printed), "90%" in English. */
export function formatPct(
  value: number,
  lang: ReportLang,
  fractionDigits = 0,
): string {
  const n = formatNumber(value, lang, fractionDigits);
  return lang === "ar" ? `%${n}` : `${n}%`;
}

/* ------------------------------------------------------------------ */
/* Glucose units                                                       */
/* ------------------------------------------------------------------ */

/** Display unit for glucose values. Stored values are always mg/dL. */
export type GlucoseUnit = "mg/dL" | "mmol/L";

/** mg/dL per 1 mmol/L (matches the conversion used when parsing). */
export const MGDL_PER_MMOL = 18.016;

/** Convert a stored mg/dL value into the numeric value of `unit`. */
export function toGlucoseUnit(mgdl: number, unit: GlucoseUnit): number {
  return unit === "mmol/L" ? mgdl / MGDL_PER_MMOL : mgdl;
}

/**
 * Format a stored mg/dL glucose value in the chosen display unit:
 * mg/dL as a whole number, mmol/L to one decimal (localized separator).
 */
export function formatGlucose(
  mgdl: number,
  unit: GlucoseUnit,
  lang: ReportLang,
): string {
  return unit === "mmol/L"
    ? formatNumber(mgdl / MGDL_PER_MMOL, lang, 1)
    : formatNumber(mgdl, lang, 0);
}

/** The label for a glucose unit ("mg/dL" / "ملجم/ديسيلتر" or "mmol/L" / "ملمول/لتر"). */
export function glucoseUnitLabel(unit: GlucoseUnit, lang: ReportLang): string {
  return dict[unit === "mmol/L" ? "mmolL" : "mgdl"][lang];
}

/** "(24س)" / "(16س 48د)" style duration from a % of a day. */
export function formatDurationOfDay(pct: number, lang: ReportLang): string {
  const totalMin = Math.round((pct / 100) * 24 * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const hu = lang === "ar" ? "س" : "h";
  const mu = lang === "ar" ? "د" : "min";
  if (h === 0) return `${m}${mu}`;
  if (m === 0) return `${h}${hu}`;
  return `${h}${hu} ${m}${mu}`;
}

const AR_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];
const EN_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const AR_DAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const EN_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const AR_DAYS_SHORT = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
const EN_DAYS_SHORT = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

export function monthName(monthIndex: number, lang: ReportLang): string {
  return (lang === "ar" ? AR_MONTHS : EN_MONTHS)[monthIndex];
}

export function weekdayName(dayIndex: number, lang: ReportLang, short = false): string {
  if (short) return (lang === "ar" ? AR_DAYS_SHORT : EN_DAYS_SHORT)[dayIndex];
  return (lang === "ar" ? AR_DAYS : EN_DAYS)[dayIndex];
}

export function formatDayMonth(d: Date, lang: ReportLang): string {
  return `${d.getDate()} ${monthName(d.getMonth(), lang)}`;
}

export function formatFullDate(d: Date, lang: ReportLang): string {
  return `${d.getDate()} ${monthName(d.getMonth(), lang)} ${d.getFullYear()}`;
}

/** "28 يونيو 2026 - 11 يوليو 2026 (14 الأيام)" period line. */
export function formatPeriod(
  start: Date,
  endExclusive: Date,
  days: number,
  lang: ReportLang,
): string {
  const last = new Date(endExclusive);
  last.setDate(last.getDate() - 1);
  const range = `${formatFullDate(start, lang)} - ${formatFullDate(last, lang)}`;
  return lang === "ar"
    ? `${range} (${days} الأيام)`
    : `${range} (${days} Days)`;
}
