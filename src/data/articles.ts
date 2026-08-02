import type { Article, ArticleContent } from "./types"

export const ARTICLES: Article[] = [
  {
    id: "mi",
    title: "Nhồi máu cơ tim",
    specialty: "Tim mạch",
    tags: ["STEMI", "NSTEMI", "ACS", "Reperfusion"],
    readTime: 18,
    difficulty: "Nâng cao",
    excerpt: "Myocardial infarction results from prolonged ischemia due to coronary artery occlusion, leading to irreversible cardiomyocyte necrosis.",
    lastUpdated: "Jul 2026",
  },
  {
    id: "stroke",
    title: "Đột quỵ thiếu máu não",
    specialty: "Thần kinh",
    tags: ["tPA", "Thrombectomy", "NIHSS", "Penumbra"],
    readTime: 22,
    difficulty: "Nâng cao",
    excerpt: "Ischemic stroke is caused by focal cerebral ischemia from arterial occlusion, accounting for approximately 87% of all strokes.",
    lastUpdated: "Jun 2026",
  },
  {
    id: "pneumonia",
    title: "Viêm phổi cộng đồng",
    specialty: "Hô hấp",
    tags: ["CAP", "S. pneumoniae", "CURB-65", "Antibiotics"],
    readTime: 14,
    difficulty: "Cơ bản",
    excerpt: "CAP is a lower respiratory tract infection acquired outside hospital settings, most commonly caused by Streptococcus pneumoniae.",
    lastUpdated: "Jul 2026",
  },
  {
    id: "dm2",
    title: "Đái tháo đường type 2",
    specialty: "Nội tiết",
    tags: ["HbA1c", "Metformin", "Insulin resistance", "GLP-1"],
    readTime: 20,
    difficulty: "Cơ bản",
    excerpt: "T2DM is characterized by insulin resistance and progressive β-cell dysfunction, leading to chronic hyperglycemia.",
    lastUpdated: "May 2026",
  },
  {
    id: "sepsis",
    title: "Nhiễm khuẩn huyết và sốc nhiễm khuẩn",
    specialty: "Hồi sức - Cấp cứu",
    tags: ["SOFA", "Lactate", "Vasopressors", "Bundles"],
    readTime: 16,
    difficulty: "Nâng cao",
    excerpt: "Sepsis is a life-threatening organ dysfunction caused by a dysregulated host response to infection.",
    lastUpdated: "Jul 2026",
  },
  {
    id: "ckd",
    title: "Bệnh thận mạn",
    specialty: "Thận học",
    tags: ["GFR", "Albuminuria", "RAAS", "CKD-MBD"],
    readTime: 19,
    difficulty: "Nâng cao",
    excerpt: "CKD is defined as abnormalities of kidney structure or function, present for more than 3 months, with implications for health.",
    lastUpdated: "Jun 2026",
  },
]

// Nội dung chi tiết từng bài, khoá theo Article.id — ArticleScreen tra cứu theo articleId
// đang mở để lấy đúng bài, thay vì hiển thị chung một bài như trước.
export const ARTICLE_CONTENT: Record<string, ArticleContent> = {
  mi: {
    toc: ["Tổng quan", "Sinh lý bệnh", "Phân loại", "Biểu hiện lâm sàng", "Chẩn đoán", "Điều trị", "Biến chứng"],
    sections: [
      {
        id: "overview",
        heading: "Tổng quan",
        content: [
          "Myocardial infarction (MI) refers to irreversible cardiomyocyte necrosis resulting from prolonged myocardial ischemia. It is the leading cause of death worldwide and a major cause of morbidity.",
          "MI is classified based on ECG findings into ST-elevation MI (STEMI) and non-ST-elevation MI (NSTEMI), which differ in pathophysiology, management strategy, and outcomes.",
        ],
      },
      {
        id: "pathophysiology",
        heading: "Sinh lý bệnh",
        content: [
          "The vast majority of MIs result from atherosclerotic coronary artery disease (CAD). Plaque rupture or erosion triggers platelet aggregation and thrombus formation, leading to partial or complete coronary occlusion.",
          "Prolonged ischemia (>20–40 minutes) causes irreversible cell injury. The wavefront of necrosis progresses from the subendocardium outward (transmural infarction if untreated).",
        ],
      },
      {
        id: "classification",
        heading: "Phân loại",
        content: [
          "Type 1 MI: Spontaneous MI from atherosclerotic plaque rupture/erosion with intracoronary thrombosis.",
          "Type 2 MI: Myocardial ischemia due to mismatch in oxygen supply/demand (e.g., coronary spasm, tachyarrhythmia, severe anemia, hypotension).",
          "Types 3–5 relate to procedural contexts (sudden cardiac death, PCI-related, CABG-related).",
        ],
      },
      {
        id: "clinical",
        heading: "Biểu hiện lâm sàng",
        content: [
          "Classic presentation: Severe substernal chest pain (pressure, squeezing), radiation to left arm/jaw, diaphoresis, nausea, dyspnea. Duration >30 minutes. Not relieved by nitroglycerin.",
          "Atypical presentations are more common in elderly, women, and diabetics: epigastric pain, dyspnea alone, syncope, or no symptoms (silent MI).",
        ],
      },
      {
        id: "diagnosis",
        heading: "Chẩn đoán",
        content: [
          "12-lead ECG: ST elevation (STEMI), ST depression/T-wave inversions (NSTEMI/UA), new LBBB.",
          "Cardiac biomarkers: High-sensitivity troponin (hsTnI/hsTnT) is the gold standard. Rise and fall pattern diagnostic. Peak at 12–24h.",
          "Echocardiography: Assess wall motion abnormalities, LV function, mechanical complications.",
        ],
      },
    ],
    keyPoints: [
      "STEMI requires emergent reperfusion (PCI preferred, door-to-balloon <90 min)",
      "High-sensitivity troponin is gold standard biomarker — rises within 1–3 hours",
      "Dual antiplatelet therapy (aspirin + P2Y₁₂ inhibitor) for all NSTEMI/STEMI",
      "Morphine use is associated with worse outcomes — consider fentanyl if needed",
    ],
    highlightTerms: ["STEMI", "NSTEMI", "troponin", "atherosclerotic", "ischemia"],
  },

  stroke: {
    toc: ["Tổng quan", "Sinh lý bệnh", "Phân loại", "Biểu hiện lâm sàng", "Chẩn đoán", "Điều trị", "Biến chứng"],
    sections: [
      {
        id: "overview",
        heading: "Tổng quan",
        content: [
          "Ischemic stroke is caused by focal cerebral ischemia from arterial occlusion, accounting for approximately 87% of all strokes; the remainder are hemorrhagic.",
          "Outcome depends heavily on time to treatment — the concept of \"time is brain\" reflects that roughly 1.9 million neurons are lost per minute of untreated large-vessel occlusion.",
        ],
      },
      {
        id: "pathophysiology",
        heading: "Sinh lý bệnh",
        content: [
          "Arterial occlusion (thrombotic or embolic) abruptly reduces cerebral blood flow, producing a densely ischemic core with irreversible injury surrounded by a penumbra — hypoperfused tissue that remains viable but at risk.",
          "The penumbra can be salvaged with timely reperfusion; without it, the infarct core progressively expands to consume the penumbra over hours.",
        ],
      },
      {
        id: "classification",
        heading: "Phân loại",
        content: [
          "TOAST classification groups ischemic stroke by mechanism: large-artery atherosclerosis, cardioembolism, small-vessel (lacunar) occlusion, stroke of other determined etiology, and stroke of undetermined etiology.",
          "Cardioembolic strokes (commonly from atrial fibrillation) tend to be larger and involve multiple vascular territories; lacunar strokes result from small penetrating-artery disease, often related to chronic hypertension.",
        ],
      },
      {
        id: "clinical",
        heading: "Biểu hiện lâm sàng",
        content: [
          "Sudden focal neurologic deficit is the hallmark — facial droop, unilateral arm/leg weakness, and speech difficulty (the FAST triad), often with sensory loss, visual field cut, or ataxia.",
          "Anterior circulation strokes typically cause contralateral hemiparesis and aphasia (if dominant hemisphere) or neglect (if non-dominant); posterior circulation strokes cause vertigo, diplopia, ataxia, or crossed sensorimotor signs.",
        ],
      },
      {
        id: "diagnosis",
        heading: "Chẩn đoán",
        content: [
          "Non-contrast CT head is the first study, primarily to exclude hemorrhage before any reperfusion therapy is considered — early ischemic change may be subtle or absent.",
          "CT or MR angiography identifies large-vessel occlusion; CT/MR perfusion imaging distinguishes salvageable penumbra from infarct core to guide late-window therapy. MRI with diffusion-weighted imaging is the most sensitive test for acute ischemia.",
          "Point-of-care glucose must be checked immediately — hypoglycemia is a common stroke mimic.",
        ],
      },
      {
        id: "treatment",
        heading: "Điều trị",
        content: [
          "IV thrombolysis (alteplase or tenecteplase) is indicated within 4.5 hours of symptom onset (or last-known-well) in eligible patients without contraindications such as recent hemorrhage or uncontrolled hypertension.",
          "Mechanical thrombectomy is indicated for confirmed large-vessel occlusion, up to 24 hours from last-known-well in carefully selected patients based on perfusion-imaging mismatch (DAWN/DEFUSE-3 criteria).",
          "Blood pressure is managed permissively (allowed up to 220/120 mmHg) unless thrombolysis or thrombectomy is planned, in which case a lower threshold (<185/110 mmHg) applies before treatment.",
        ],
      },
      {
        id: "complications",
        heading: "Biến chứng",
        content: [
          "Hemorrhagic transformation of the infarct is the most feared early complication, particularly after thrombolysis.",
          "Large infarcts can cause cerebral edema and malignant MCA syndrome, sometimes requiring decompressive hemicraniectomy; aspiration pneumonia and recurrent stroke are important later risks.",
        ],
      },
    ],
    keyPoints: [
      "IV thrombolysis window is 4.5 hours from symptom onset/last-known-well",
      "Thrombectomy extends to 24h for large-vessel occlusion with favorable imaging",
      "Non-contrast CT's main job before treatment is excluding hemorrhage",
      "Check glucose immediately — hypoglycemia is a common stroke mimic",
    ],
    highlightTerms: ["penumbra", "thrombectomy", "thrombolysis", "NIHSS", "hemorrhagic transformation"],
  },

  pneumonia: {
    toc: ["Tổng quan", "Sinh lý bệnh", "Phân loại", "Biểu hiện lâm sàng", "Chẩn đoán", "Điều trị", "Biến chứng"],
    sections: [
      {
        id: "overview",
        heading: "Tổng quan",
        content: [
          "Community-acquired pneumonia (CAP) is a lower respiratory tract infection acquired outside hospital settings, most commonly caused by Streptococcus pneumoniae.",
          "Atypical organisms (Mycoplasma pneumoniae, Chlamydophila pneumoniae, Legionella) and respiratory viruses are increasingly recognized as frequent causes, sometimes indistinguishable from typical CAP on presentation alone.",
        ],
      },
      {
        id: "pathophysiology",
        heading: "Sinh lý bệnh",
        content: [
          "Infection typically follows microaspiration of oropharyngeal flora or inhalation of infectious droplets, overwhelming local host defenses (mucociliary clearance, alveolar macrophages).",
          "The resulting inflammatory response causes alveolar filling with exudate (consolidation), impairing gas exchange and producing the classic radiographic infiltrate.",
        ],
      },
      {
        id: "classification",
        heading: "Phân loại",
        content: [
          "Severity scoring — most commonly CURB-65 (Confusion, Urea, Respiratory rate ≥30, Blood pressure low, age ≥65) or the Pneumonia Severity Index (PSI) — determines the appropriate site of care: outpatient, ward, or ICU.",
          "The older \"healthcare-associated pneumonia\" category has been retired from current IDSA/ATS guidance; management is instead driven by validated risk factors for resistant organisms (e.g., prior isolation of MRSA or Pseudomonas) rather than healthcare contact alone.",
        ],
      },
      {
        id: "clinical",
        heading: "Biểu hiện lâm sàng",
        content: [
          "Typical features are fever, productive cough, pleuritic chest pain, dyspnea, and tachypnea, often with crackles or bronchial breath sounds on exam.",
          "Elderly patients frequently present atypically — confusion or functional decline with minimal fever or respiratory symptoms — which can delay diagnosis.",
        ],
      },
      {
        id: "diagnosis",
        heading: "Chẩn đoán",
        content: [
          "Chest X-ray showing a new infiltrate is required to confirm the diagnosis in most guidelines; CURB-65 is calculated to guide disposition.",
          "Blood and sputum cultures, and urinary antigen testing for pneumococcus and Legionella, are recommended for patients with severe CAP or specific risk factors, but are not routinely needed for low-risk outpatients.",
        ],
      },
      {
        id: "treatment",
        heading: "Điều trị",
        content: [
          "Healthy outpatients: amoxicillin, or doxycycline, or a macrolide where local pneumococcal resistance is low.",
          "Outpatients with comorbidities, or inpatients on a general ward: a beta-lactam plus a macrolide, or a respiratory fluoroquinolone alone.",
          "Severe CAP (ICU): a beta-lactam plus either a macrolide or a respiratory fluoroquinolone, adding empiric MRSA or Pseudomonas coverage only if specific risk factors are present. Treatment duration is typically a minimum of 5 days, guided by clinical stability rather than a fixed course.",
        ],
      },
      {
        id: "complications",
        heading: "Biến chứng",
        content: [
          "Parapneumonic effusion can progress to empyema requiring drainage; lung abscess may occur with aspiration or necrotizing organisms.",
          "Severe cases can progress to ARDS and septic shock; failure to improve within 48–72 hours warrants repeat imaging and reassessment for an alternative diagnosis or resistant organism.",
        ],
      },
    ],
    keyPoints: [
      "CURB-65 or PSI guides site-of-care decisions (outpatient/ward/ICU)",
      "Empiric antibiotic choice should always cover atypical pathogens",
      "Chest X-ray infiltrate confirms the diagnosis in most guidelines",
      "Minimum treatment duration is 5 days, guided by clinical stability",
    ],
    highlightTerms: ["CURB-65", "CAP", "pneumococcal", "macrolide", "atypical"],
  },

  dm2: {
    toc: ["Tổng quan", "Sinh lý bệnh", "Phân loại", "Biểu hiện lâm sàng", "Chẩn đoán", "Điều trị", "Biến chứng"],
    sections: [
      {
        id: "overview",
        heading: "Tổng quan",
        content: [
          "Type 2 diabetes mellitus (T2DM) is characterized by insulin resistance and progressive β-cell dysfunction, leading to chronic hyperglycemia.",
          "Its global prevalence continues to rise in parallel with obesity, and a growing share of new diagnoses now occur in younger adults and adolescents.",
        ],
      },
      {
        id: "pathophysiology",
        heading: "Sinh lý bệnh",
        content: [
          "Insulin resistance in liver, skeletal muscle, and adipose tissue is initially compensated by increased insulin secretion; hyperglycemia emerges once β-cell capacity can no longer keep pace with demand.",
          "Multiple organs contribute beyond the classic liver–muscle–pancreas triad — the so-called \"ominous octet\" also includes the kidney (increased glucose reabsorption), gut incretin deficiency, adipose lipolysis, and altered brain appetite regulation.",
        ],
      },
      {
        id: "classification",
        heading: "Phân loại",
        content: [
          "T2DM is distinguished from type 1 diabetes (autoimmune β-cell destruction, absolute insulin deficiency, typically younger onset) by its association with insulin resistance, more gradual onset, and frequent association with metabolic syndrome.",
          "Other categories include gestational diabetes, monogenic forms (e.g., MODY), and pancreatogenic diabetes from pancreatic disease — each with distinct implications for treatment.",
        ],
      },
      {
        id: "clinical",
        heading: "Biểu hiện lâm sàng",
        content: [
          "Classic symptoms are polyuria, polydipsia, polyphagia, and unexplained weight loss, but many patients are asymptomatic and diagnosed incidentally on screening.",
          "Recurrent infections (skin, genitourinary), blurred vision, and poor wound healing can also be presenting features, especially with prolonged undiagnosed hyperglycemia.",
        ],
      },
      {
        id: "diagnosis",
        heading: "Chẩn đoán",
        content: [
          "Diagnosis requires any one of: HbA1c ≥6.5%, fasting plasma glucose ≥126 mg/dL, 2-hour glucose ≥200 mg/dL on OGTT, or a random glucose ≥200 mg/dL with classic symptoms — confirmed on a repeat test unless unequivocal hyperglycemia is present.",
          "At diagnosis, baseline evaluation should include a lipid panel, renal function with urine albumin-to-creatinine ratio, and a dilated retinal exam to establish a complication baseline.",
        ],
      },
      {
        id: "treatment",
        heading: "Điều trị",
        content: [
          "Metformin combined with lifestyle modification remains first-line therapy for most patients at diagnosis.",
          "A GLP-1 receptor agonist or SGLT2 inhibitor is added independent of HbA1c in patients with established atherosclerotic cardiovascular disease, heart failure, or chronic kidney disease, given their proven cardio-renal protective effects.",
          "Insulin is reserved for symptomatic or severe hyperglycemia (e.g., HbA1c markedly elevated) or when oral/injectable non-insulin therapy fails to achieve individualized glycemic targets.",
        ],
      },
      {
        id: "complications",
        heading: "Biến chứng",
        content: [
          "Microvascular complications include retinopathy, nephropathy, and peripheral/autonomic neuropathy, all related to cumulative glycemic exposure.",
          "Macrovascular disease (coronary artery disease, stroke, peripheral arterial disease) is the leading cause of death in T2DM; acute hyperosmolar hyperglycemic state (HHS) is the characteristic acute decompensation, though diabetic ketoacidosis can also occur.",
        ],
      },
    ],
    keyPoints: [
      "Metformin plus lifestyle change is first-line at diagnosis",
      "GLP-1 RA/SGLT2i added for cardio-renal protection regardless of HbA1c",
      "Glycemic targets should be individualized, not uniformly <7%",
      "Screen for microvascular complications at diagnosis and regularly thereafter",
    ],
    highlightTerms: ["HbA1c", "metformin", "insulin resistance", "SGLT2", "GLP-1"],
  },

  sepsis: {
    toc: ["Tổng quan", "Sinh lý bệnh", "Phân loại", "Biểu hiện lâm sàng", "Chẩn đoán", "Điều trị", "Biến chứng"],
    sections: [
      {
        id: "overview",
        heading: "Tổng quan",
        content: [
          "Sepsis is a life-threatening organ dysfunction caused by a dysregulated host response to infection.",
          "Septic shock is a subset of sepsis with profound circulatory, cellular, and metabolic abnormalities associated with substantially higher mortality than sepsis alone.",
        ],
      },
      {
        id: "pathophysiology",
        heading: "Sinh lý bệnh",
        content: [
          "Pathogen recognition triggers a massive release of pro-inflammatory cytokines, causing widespread endothelial dysfunction, activation of the coagulation cascade, and microvascular thrombosis.",
          "The combination of vasodilation and capillary leak leads to relative and absolute hypovolemia, reducing tissue perfusion and driving organ dysfunction even when cardiac output is preserved or elevated.",
        ],
      },
      {
        id: "classification",
        heading: "Phân loại",
        content: [
          "The Sequential Organ Failure Assessment (SOFA) score quantifies organ dysfunction; an acute increase of ≥2 points in the setting of infection defines sepsis under the Sepsis-3 criteria.",
          "qSOFA (respiratory rate ≥22/min, altered mentation, systolic BP ≤100 mmHg) is a rapid bedside screen for high-risk patients outside the ICU, though it has limited sensitivity and should not replace full evaluation.",
          "Septic shock is defined as sepsis with vasopressor requirement to maintain mean arterial pressure ≥65 mmHg AND serum lactate >2 mmol/L despite adequate fluid resuscitation.",
        ],
      },
      {
        id: "clinical",
        heading: "Biểu hiện lâm sàng",
        content: [
          "Fever or hypothermia, tachycardia, tachypnea, and altered mental status are common; hypotension and oliguria signal progression toward shock.",
          "Source-specific signs often point to the underlying infection — e.g., cough and hypoxia in pneumonia, abdominal pain in intra-abdominal infection, or dysuria in urosepsis.",
        ],
      },
      {
        id: "diagnosis",
        heading: "Chẩn đoán",
        content: [
          "Blood cultures should be obtained before antibiotics whenever this does not meaningfully delay treatment; serum lactate helps identify occult hypoperfusion.",
          "Source identification (imaging, urinalysis, wound assessment) is pursued in parallel with resuscitation; SOFA/qSOFA scoring supports risk stratification but does not replace clinical judgment.",
        ],
      },
      {
        id: "treatment",
        heading: "Điều trị",
        content: [
          "The Surviving Sepsis Campaign Hour-1 bundle recommends measuring lactate, obtaining blood cultures, and starting broad-spectrum antibiotics within one hour of recognition.",
          "Patients with hypotension or lactate ≥4 mmol/L should receive 30 mL/kg of crystalloid, with further fluids guided by dynamic responsiveness measures rather than fixed volumes.",
          "Norepinephrine is the first-line vasopressor when hypotension persists despite fluids, titrated to a MAP ≥65 mmHg; source control (drainage, debridement, device removal) is essential wherever applicable.",
        ],
      },
      {
        id: "complications",
        heading: "Biến chứng",
        content: [
          "Multi-organ failure — acute kidney injury, ARDS, and disseminated intravascular coagulation (DIC) — is common in severe cases.",
          "Survivors may develop critical illness myopathy/neuropathy and a broader post-sepsis syndrome with lasting functional and cognitive impairment; delayed antibiotic administration is strongly associated with increased mortality.",
        ],
      },
    ],
    keyPoints: [
      "Hour-1 bundle: lactate, cultures, and antibiotics within one hour",
      "Norepinephrine is the first-line vasopressor in septic shock",
      "Source control is essential and should not be delayed once identified",
      "qSOFA is a rapid screen only — it does not replace full evaluation",
    ],
    highlightTerms: ["SOFA", "lactate", "norepinephrine", "vasopressor", "septic shock"],
  },

  ckd: {
    toc: ["Tổng quan", "Sinh lý bệnh", "Phân loại", "Biểu hiện lâm sàng", "Chẩn đoán", "Điều trị", "Biến chứng"],
    sections: [
      {
        id: "overview",
        heading: "Tổng quan",
        content: [
          "Chronic kidney disease (CKD) is defined as abnormalities of kidney structure or function, present for more than 3 months, with implications for health.",
          "It is staged by both glomerular filtration rate (GFR) and degree of albuminuria, since either dimension independently predicts progression and cardiovascular risk.",
        ],
      },
      {
        id: "pathophysiology",
        heading: "Sinh lý bệnh",
        content: [
          "Nephron loss from any cause triggers compensatory hyperfiltration in remaining nephrons; the resulting glomerular hypertension accelerates sclerosis and further nephron loss — a self-perpetuating cycle of progression.",
          "Activation of the renin-angiotensin-aldosterone system (RAAS) contributes substantially to this cycle by raising intraglomerular pressure and promoting fibrosis, which is why RAAS blockade is central to slowing progression.",
        ],
      },
      {
        id: "classification",
        heading: "Phân loại",
        content: [
          "The KDIGO staging system combines GFR category (G1 ≥90 down to G5 <15 mL/min/1.73m²) with albuminuria category (A1 normal, A2 moderately increased, A3 severely increased) into a combined risk \"heat map.\"",
          "Risk of progression, cardiovascular events, and mortality all rise as GFR falls and albuminuria increases, and the two axes are assessed independently rather than substituted for one another.",
        ],
      },
      {
        id: "clinical",
        heading: "Biểu hiện lâm sàng",
        content: [
          "CKD is often asymptomatic until advanced stages, which is why screening in at-risk populations (diabetes, hypertension) is essential rather than waiting for symptoms.",
          "As GFR declines, fatigue, edema, worsening hypertension, and pruritus emerge; uremic symptoms such as nausea, anorexia, and cognitive slowing appear near end-stage kidney disease.",
        ],
      },
      {
        id: "diagnosis",
        heading: "Chẩn đoán",
        content: [
          "eGFR is estimated from serum creatinine using validated equations (e.g., CKD-EPI); urine albumin-to-creatinine ratio quantifies albuminuria on a spot sample.",
          "Renal ultrasound assesses kidney size and excludes obstruction; reversible causes (volume depletion, nephrotoxic medications, obstruction) should always be considered before labeling a decline as chronic.",
        ],
      },
      {
        id: "treatment",
        heading: "Điều trị",
        content: [
          "Blood pressure control (generally targeting <130/80 mmHg) with an ACE inhibitor or ARB as first-line agent is central to slowing progression, particularly when albuminuria is present.",
          "SGLT2 inhibitors are now recommended as standard therapy for eligible CKD patients regardless of diabetes status, given consistent evidence of slowed progression and reduced cardiovascular events.",
          "CKD-mineral and bone disorder is managed with phosphate control, vitamin D, and monitoring of parathyroid hormone; nephrotoxic drugs should be avoided or dose-adjusted, and referral to nephrology is recommended well before GFR reaches levels requiring renal replacement therapy.",
        ],
      },
      {
        id: "complications",
        heading: "Biến chứng",
        content: [
          "CKD-mineral and bone disorder (secondary hyperparathyroidism, vascular calcification) and anemia from erythropoietin deficiency are common as GFR declines.",
          "Cardiovascular disease is the leading cause of death in CKD, exceeding the risk of ever reaching end-stage kidney disease for many patients; metabolic acidosis is another frequent, treatable complication.",
        ],
      },
    ],
    keyPoints: [
      "Staged by both GFR and albuminuria — the two axes are assessed independently",
      "ACE inhibitor/ARB plus SGLT2 inhibitor are now cornerstone therapy",
      "Cardiovascular disease, not dialysis, is the leading cause of death in CKD",
      "Refer to nephrology well before GFR reaches end-stage levels",
    ],
    highlightTerms: ["GFR", "albuminuria", "RAAS", "CKD-MBD", "eGFR"],
  },
}
