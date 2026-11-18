"""Hand-authored structure of NCTB Class 5 Elementary Mathematics (AY 2026).

Everything in this file was read visually from the page images (English book for
structure, Bangla book for titles/headings). Page numbers are PRINTED page numbers;
pdf page = printed page + 7 for the whole numbered body (pdf 8..189).
"""

PDF_OFFSET = 7  # pdf_page = printed_page + 7
FIRST_BODY_PDF, LAST_BODY_PDF = 8, 189

FRONT_MATTER = {
    1: "Front cover", 2: "Title page", 3: "Imprint / credits", 4: "Preface",
    5: "Explanation of the characters and symbols (icon legend)",
    6: "Table of contents", 7: "Name page", 190: "Back cover",
}

# (number, title_en, title_bn, printed_start, printed_end)
CHAPTERS = [
    (1, "Multiplication and Division", "গুণ ও ভাগ", 1, 16),
    (2, "Mathematical Sentences", "গাণিতিক বাক্য", 17, 30),
    (3, "Multiples and Factors", "গুণিতক ও গুণনীয়ক", 31, 48),
    (4, "Common Fractions", "সাধারণ ভগ্নাংশ", 49, 62),
    (5, "Decimal Fractions", "দশমিক ভগ্নাংশ", 63, 90),
    (6, "Percentage", "শতকরা", 91, 104),
    (7, "Average", "গড়", 105, 114),
    (8, "Measurement", "পরিমাপ", 115, 148),
    (9, "Geometry", "জ্যামিতি", 149, 170),
    (10, "Data Arrangement", "উপাত্ত বিন্যস্তকরণ", 171, 182),
]

# chapter -> [(title_en, title_bn, printed_from, printed_to, concept_slug, bn_title_printed)]
# bn_title_printed=True when the Bangla title is (or starts with) a heading printed in the book;
# otherwise the lesson title is derived by us from the page content.
LESSONS = {
    1: [
        ("Multiplying large numbers vertically", "বড় সংখ্যার গুণ (উপরে-নিচে)", 1, 3, "multiply-vertical", False),
        ("Multiplying horizontally by breaking up a number", "ভেঙে পাশাপাশি গুণ", 4, 4, "multiply-horizontal", False),
        ("Multiplying numbers that end in zeros", "শেষে শূন্য থাকা সংখ্যার সহজ গুণ", 5, 5, "multiply-zeros", False),
        ("Simple method: multiplying by 99, 999, 9999", "সহজ পদ্ধতিতে ৯৯, ৯৯৯, ৯৯৯৯ দিয়ে গুণ", 6, 7, "multiply-simple-method", False),
        ("Division by a two-digit number", "দুই অঙ্কের সংখ্যা দিয়ে ভাগ", 8, 8, "divide-two-digit", True),
        ("Division by a three-digit number and checking the answer", "তিন অঙ্কের সংখ্যা দিয়ে ভাগ ও যাচাই", 9, 11, "divide-three-digit", False),
        ("Dividing by 10 and 100", "১০ ও ১০০ দিয়ে ভাগ", 11, 12, "divide-by-10-100", False),
        ("Division word problems", "ভাগের সমস্যা সমাধান", 12, 13, "division-word-problems", False),
    ],
    2: [
        ("Unknown numbers in mathematical sentences", "গাণিতিক বাক্যে অজানা সংখ্যা", 17, 17, "unknown-in-sentence", False),
        ("Open and closed sentences", "খোলা বাক্য ও বদ্ধ বাক্য", 18, 18, "open-closed-sentences", False),
        ("Relations between two quantities", "দুটি রাশির সম্পর্ক", 19, 19, "relation-two-quantities", False),
        ("Order of operations and brackets", "হিসাবের ধারাবাহিকতা", 20, 20, "order-of-operations", True),
        ("Word problems with brackets", "বন্ধনী ব্যবহার করে সমস্যা সমাধান", 21, 22, "bracket-word-problems", False),
        ("Sum-and-difference and 'times as many' problems", "সমষ্টি, পার্থক্য ও গুণিতক সংক্রান্ত সমস্যা", 23, 24, "sum-difference-problems", False),
        ("Unitary method", "ঐকিক নিয়ম", 25, 27, "unitary-method", True),
    ],
    3: [
        ("Multiples and common multiples", "গুণিতক ও সাধারণ গুণিতক", 31, 32, "multiples", True),
        ("Least common multiple (LCM)", "লঘিষ্ঠ সাধারণ গুণিতক (লসাগু)", 33, 34, "lcm", False),
        ("Prime factors and LCM using prime factors", "মৌলিক গুণনীয়ক ও তার সাহায্যে লসাগু", 35, 36, "prime-factorisation", False),
        ("Divisibility by 3 and 4", "৩ ও ৪ দ্বারা বিভাজ্যতা", 37, 38, "divisibility-3-4", False),
        ("LCM by the division method", "ভাগ প্রক্রিয়ায় লসাগু", 39, 39, "lcm-division-method", False),
        ("Factors", "গুণনীয়ক", 40, 40, "factors", True),
        ("Highest common factor (HCF)", "গরিষ্ঠ সাধারণ গুণনীয়ক", 41, 43, "hcf", True),
        ("HCF using prime factors", "মৌলিক গুণনীয়কের সাহায্যে গসাগু", 44, 45, "hcf-prime-factors", False),
    ],
    4: [
        ("Mixed and improper fractions", "মিশ্র ও অপ্রকৃত ভগ্নাংশ", 49, 50, "mixed-improper", False),
        ("Equivalent fractions", "সমতুল ভগ্নাংশ", 51, 51, "equivalent-fractions", False),
        ("Fractions in lowest form", "ভগ্নাংশের লঘিষ্ঠ আকার", 52, 52, "lowest-form", False),
        ("Comparing fractions using a common denominator", "সমহরবিশিষ্ট করে ভগ্নাংশের তুলনা", 53, 55, "compare-fractions", False),
        ("Adding fractions with different denominators", "ভিন্ন হরবিশিষ্ট ভগ্নাংশের যোগ", 56, 56, "add-fractions", False),
        ("Subtracting fractions with different denominators", "ভিন্ন হরবিশিষ্ট ভগ্নাংশের বিয়োগ", 57, 57, "subtract-fractions", False),
        ("Calculating with several fractions", "একাধিক ভগ্নাংশের হিসাব", 58, 58, "fractions-mixed-operations", False),
        ("Adding and subtracting mixed fractions", "মিশ্র ভগ্নাংশের যোগ ও বিয়োগ", 59, 60, "mixed-fraction-operations", False),
    ],
    5: [
        ("Tenths, hundredths and thousandths", "দশমাংশ, শতাংশ ও সহস্রাংশ", 63, 67, "decimal-place-value", False),
        ("Converting between decimal and common fractions", "সাধারণ ভগ্নাংশে ও দশমিক ভগ্নাংশে রূপান্তর", 68, 69, "decimal-fraction-conversion", True),
        ("Comparing decimal fractions", "দশমিক ভগ্নাংশের তুলনা", 70, 71, "compare-decimals", False),
        ("Addition and subtraction of decimal numbers", "দশমিক সংখ্যার যোগ ও বিয়োগ", 72, 73, "decimal-add-subtract", True),
        ("Multiplication of decimals by whole numbers", "দশমিক সংখ্যার গুণ", 74, 75, "decimal-multiply-whole", True),
        ("Multiplying by 10, 100, 1000 and decimal by decimal", "১০, ১০০, ১০০০ দিয়ে এবং দশমিক দিয়ে গুণ", 76, 77, "decimal-multiply-decimal", False),
        ("Division of decimal numbers by whole numbers", "দশমিক সংখ্যার ভাগ", 78, 81, "decimal-divide-whole", True),
        ("Dividing decimals by 10 and 100", "১০ ও ১০০ দিয়ে দশমিক সংখ্যার ভাগ", 82, 82, "decimal-divide-10-100", False),
        ("Dividing by a decimal number", "দশমিক সংখ্যা দিয়ে ভাগ", 83, 86, "divide-by-decimal", False),
    ],
    6: [
        ("What percent means", "শতকরা কী", 91, 92, "percent-meaning", False),
        ("Finding a percentage of a quantity", "কোনো পরিমাণের শতকরা অংশ নির্ণয়", 93, 94, "percent-of-quantity", False),
        ("Comparing and changing by a percentage", "শতকরায় তুলনা ও বৃদ্ধি", 95, 96, "percent-compare-change", False),
        ("Profit and loss", "লাভ ও ক্ষতি", 97, 98, "profit-loss", False),
        ("Profit on principal (rate of profit)", "আসল ও মুনাফা", 99, 101, "profit-on-principal", False),
    ],
    7: [
        ("What an average is", "গড় কী", 105, 106, "average-meaning", False),
        ("Finding totals and missing values from an average", "গড় থেকে মোট ও অজানা মান নির্ণয়", 107, 107, "average-missing-value", False),
        ("Average problems from everyday data", "দৈনন্দিন উপাত্ত থেকে গড়", 108, 110, "average-word-problems", False),
        ("An easy way to find an average", "সহজে গড় নির্ণয়ের পদ্ধতি", 111, 112, "average-easy-method", False),
    ],
    8: [
        ("Length measurement", "দৈর্ঘ্য পরিমাপ", 115, 117, "length-units", True),
        ("Weight measurement", "ওজন পরিমাপ", 118, 119, "weight-units", True),
        ("Volume measurement", "আয়তন পরিমাপ", 120, 121, "volume-units", True),
        ("Area of rectangles and squares", "আয়ত ও বর্গের ক্ষেত্রফল", 124, 126, "area-rectangle-square", True),
        ("Area of parallelograms", "সামান্তরিকের ক্ষেত্রফল", 127, 128, "area-parallelogram", True),
        ("Area of triangles", "ত্রিভুজের ক্ষেত্রফল", 129, 131, "area-triangle", True),
        ("Conversion of time", "সময়ের রূপান্তর", 134, 135, "time-conversion", True),
        ("Bangla and English calendar", "বাংলা ও ইংরেজি ক্যালেন্ডার", 136, 137, "calendars", True),
        ("Calculating ages and durations", "বয়স ও সময়ের ব্যবধান নির্ণয়", 138, 140, "age-duration", False),
        ("24-hour clock", "২৪ ঘণ্টা সময়সূচি", 141, 143, "clock-24-hour", True),
        ("Leap year, decade, era and century", "অধিবর্ষ, দশক, যুগ ও শতাব্দী", 144, 145, "leap-year-century", True),
    ],
    9: [
        ("Trapezium and parallelogram", "ট্রাপিজিয়াম ও সামান্তরিক", 149, 153, "trapezium-parallelogram", True),
        ("Rhombus", "রম্বস", 154, 155, "rhombus", True),
        ("Diagonals and types of quadrilaterals", "চতুর্ভুজের কর্ণ", 156, 158, "quadrilateral-diagonals", True),
        ("Circle", "বৃত্ত", 159, 162, "circle", True),
        ("Geometric patterns", "জ্যামিতিক প্যাটার্ন", 164, 165, "geometric-patterns", True),
        ("Solids", "ঘনবস্তু", 166, 168, "solids", True),
    ],
    10: [
        ("Arranging data in tables", "উপাত্ত সাজানো ও সারণি", 171, 172, "data-tables", False),
        ("Bar diagrams and histograms", "স্তম্ভলেখ ও আয়তলেখ", 173, 175, "histogram", False),
        ("Line graphs", "রেখাচিত্র", 176, 177, "line-graph", True),
        ("Pie charts", "পাই চার্ট", 178, 179, "pie-chart", True),
    ],
}

# "Let us try" (দেখি পারি কি না) pages, printed.  chapter -> [[pages], ...]
LET_US_TRY = {1: [[14]], 2: [[28]], 3: [[46]], 4: [[61]], 5: [[87, 88]], 6: [[102]], 7: [[113]],
              8: [[122], [132], [146, 147]], 9: [[163]], 10: [[180]]}

# "Let us do" (নিজে করি) sets, printed pages + what part of the chapter they cover.
LET_US_DO = {
    1: [([15, 16], None, None)], 2: [([29, 30], None, None)], 3: [([47, 48], None, None)],
    4: [([62], None, None)], 5: [([89, 90], None, None)], 6: [([103, 104], None, None)],
    7: [([114], None, None)],
    8: [([123], "Length, weight and volume", "দৈর্ঘ্য, ওজন ও আয়তন"),
        ([133], "Area", "ক্ষেত্রফল"),
        ([148], "Time", "সময়")],
    9: [([169, 170], None, None)], 10: [([181, 182], None, None)],
}

# Manual transcriptions (read from the page images) for "Let us do" questions whose
# OCR text was unusable (fractions, figures). key: (chapter, set_index, question_number)
MANUAL = {
    (3, 1, 2): {"text": "Write the full form of LCM and HCF."},
    (3, 1, 3): {"text": "Check whether the following numbers are divisible by 3.", "subs": {"1": "423", "2": "643", "3": "931", "4": "90312"}},
    (3, 1, 4): {"text": "Check whether the following numbers are divisible by 4.", "subs": {"1": "732", "2": "908", "3": "1028", "4": "92500"}},
    (3, 1, 7): {"text": "Find the LCM.", "subs": {"1": "9, 15", "2": "24, 27", "3": "7, 15", "4": "6, 9, 12", "5": "8, 12, 16", "6": "7, 10, 12, 14", "7": "6, 8, 12, 16", "8": "9, 12, 15, 18"}},
    (3, 1, 8): {"text": "Find the HCF.", "subs": {"1": "9, 15", "2": "21, 30", "3": "32, 36", "4": "13, 14", "5": "12, 18, 24", "6": "12, 24, 36", "7": "26, 39, 52", "8": "8, 12, 16, 36"}},
    (3, 1, 9): {"text": "Which is the smallest number divisible by 9 and 12?"},
    (3, 1, 10): {"text": "What is the minimum number of chocolates needed to be divided equally among 18 boys and 27 girls of grade 5?"},
    (3, 1, 14): {"text": "A rectangular floor (48 metres by 36 metres) is shown. We want to cover the entire floor with square carpets without leaving any empty space.",
                 "subs": {"a": "Determine the length of one side of the largest square carpet that can be placed on the floor.", "b": "How many such carpets will be needed to cover the entire floor completely?"}},
    (3, 1, 15): {"text": "There are 42 mangoes and 105 litchis in a basket.",
                 "subs": {"1": "What is the maximum number of students among whom the mangoes and litchis can be divided equally?", "2": "How many mangoes and litchis will each student get?"}},
    (4, 1, 1): {"text": "Put the tick mark (√) on the correct answer.", "subs": {
        "1": "Which one is the mixed form of the fraction 17/5? (a) 1 7/5 (b) 2 2/5 (c) 3 2/5 (d) 2 3/5",
        "2": "Which one of the following fractions is the largest? (a) 3/4 (b) 3/5 (c) 3/7 (d) 3/8",
        "3": "Which one of the following fractions is the lowest form of 28/56? (a) 14/28 (b) 7/14 (c) 4/8 (d) 1/2"}},
    (4, 1, 2): {"text": "Calculate.", "subs": {"1": "2/9 + 12/5", "2": "3 1/3 + 2 4/9", "3": "2/9 − 12/5 (as printed)", "4": "3 1/6 − 2 1/10", "5": "3/4 + 7/8 − 11/12", "6": "1 1/3 + 3 1/4 − 2 5/6 − 3/4"}},
    (4, 1, 3): {"text": "How many metres are the two ribbons of length 3 3/4 m and 2 1/3 m altogether?"},
    (4, 1, 4): {"text": "Geeta has 1 5/6 Litres and Mamun has 13/8 Litres of juice. Who has more juice and how much more?"},
    (4, 1, 5): {"text": "Sabuz's house is 3/8 km west of the school. Mitu's house is 5/12 km east of the school.",
                "subs": {"a": "How many km is the distance from Sabuz's house to Mitu's house?", "b": "Whose house is nearer to the school? What is the difference of the distances of Sabuz's and Mitu's house from the school?"}},
    (5, 1, 1): {"text": "Put a tick mark (√) on the correct answer.", "subs": {
        "1": "Which three fractions below are equal to 0.25? (a) 3/12, 5/10, 6/12 (b) 1/4, 2/8, 3/12 (c) 1/2, 4/8, 2/8 (d) 5/6, 4/16, 5/10",
        "2": "Nishi painted red 0.35 part of a white paper. How much part of the paper remained white? (a) 0.35 parts (b) 0.55 parts (c) 0.65 parts (d) 0.75 parts",
        "3": "87 × 0.001 = ? (a) 8.70 (b) 87.00 (c) 0.87 (d) 0.087",
        "4": "57.7 ÷ 10 = ? (a) 0.577 (b) 5.77 (c) 57.7 (d) 577"}},
    (5, 1, 2): {"text": "Express the following numbers in the number line: 0.881, 0.889, 0.899, 0.912"},
    (5, 1, 3): {"text": "How many 0.001s will make the following numbers?", "subs": {"1": "0.031", "2": "0.296", "3": "1.047", "4": "1.03"}},
    (5, 1, 4): {"text": "Multiply the following numbers by 10 and 100, and then divide them by 10.", "subs": {"1": "0.6", "2": "0.49", "3": "1.31", "4": "8.52"}},
    (5, 1, 5): {"text": "Convert the following simple fractions into decimal fractions and the decimal fractions into simple fractions. When possible, express in their lowest form.",
                "subs": {"1": "3/25", "2": "3/4", "3": "0.6", "4": "0.25", "5": "0.075"}},
    (5, 1, 8): {"text": "Multiply.", "subs": {"1": "0.4 × 2", "2": "0.5 × 8", "3": "0.06 × 5", "4": "0.004 × 5"}},
    (5, 1, 10): {"text": "Fill in the blanks.", "subs": {"1": "2 ÷ 1.6 = (2 ÷ 16) × □ = □", "2": "3 ÷ 0.25 = (3 ÷ 25) × □ = □", "3": "5 ÷ 0.125 = (5 ÷ 125) × □ = □"}},
    (5, 1, 13): {"text": "A car travels 42.8 km in one hour. How many kilometres will the car travel in 15.5 hours?"},
    (6, 1, 1): {"text": "Let us put a tick mark (√) on the correct answer.", "subs": {
        "1": "If 50% of a number is 6, what is the number? (a) 12 (b) 24 (c) 30 (d) 40",
        "2": "Which one of the following is correct? (a) 9/25 = 45% (b) 9/25 = 36% (c) 9/25 = 18% (d) 9/25 = 9%",
        "3": "What % area of the figure is colored? [3 of 5 equal boxes are coloured] (a) 3% (b) 15% (c) 60% (d) 75%",
        "4": "How many liters is 10% of 50 liters? (a) 5 (b) 10 (c) 40 (d) 50",
        "5": "If 100% means 1, then what is 150%? (a) 15 (b) 1.5 (c) 0.15 (d) 0.015"}},
    (6, 1, 3): {"text": "Fill in the blanks.", "subs": {"a": "24 people are □% of 60 people.", "b": "165% of 650 taka is □ taka.", "c": "56% of □ litchis are 42 litchis."}},
    (8, 2, 1): {"text": "Put the correct words in the blank boxes.", "subs": {"1": "Area of a parallelogram = □ × □", "2": "Area of a triangle = □ × □ ÷ 2"}},
    (8, 2, 2): {"text": "Find the area of the following figures.", "subs": {
        "1": "Triangle: base 5 cm, height 4 cm", "2": "Triangle: base 9 cm, height 6 cm (height outside the triangle)",
        "3": "Parallelogram: base 5 cm, height 6 cm", "4": "Parallelogram: base 2 cm, height 10 cm"}},
    (8, 2, 5): {"text": "If the height of a triangular design is 0.8 m and its area is 1.2 sq m, what is its area in metres? (as printed; the question asks for the base)"},
    (8, 2, 6): {"text": "Find the area of the coloured part of the following figures.", "subs": {"1": "Figure in a 9 cm by 5 cm rectangle (see page)", "2": "Triangle figure with 10 cm base, 12 cm and 5 cm heights (see page)"}},
    (8, 2, 7): {"text": "Find the total area of the coloured part of the house in the figure below. (see page for the figure)"},
    (8, 3, 4): {"text": "Find the number of days in February in the following years.", "subs": {"1": "1200", "2": "1692", "3": "2010"}},
    (8, 3, 6): {"text": "Write the century of the following years.", "subs": {"1": "108", "2": "1015", "3": "2001"}},
}

# Sub-item labels read visually for the chapter 1 "Let us do" (used as a regression anchor)
EXPECTED_LUD_COUNTS = {1: [14], 2: [15], 3: [15], 4: [5], 5: [19], 6: [14], 7: [7], 8: [9, 7, 8], 9: [6], 10: [5]}

MARKER_KINDS = {
    "task": {"label_en": "Task", "label_bn": "কাজ", "icon": "green triangle"},
    "exercise": {"label_en": "Exercise", "label_bn": "অনুশীলন", "icon": "orange square"},
    "letusdo": {"label_en": "Let us do", "label_bn": "নিজে করি", "icon": "blue circle"},
}
