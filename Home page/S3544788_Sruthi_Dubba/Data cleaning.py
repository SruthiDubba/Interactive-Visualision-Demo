import pandas as pd
import numpy as np

# Step 1: Load dataset
df = pd.read_csv("Raw _Data.csv")

# Step 2: Select only required columns
df = df[[
    "Age at Diagnosis",
    "Tumor Size",
    "Overall Survival (Months)",
    "Overall Survival Status",
    "Tumor Stage"
]]

# Step 3: Rename columns (very important for D3 compatibility)
df.columns = [
    "age_at_diagnosis",
    "tumor_size",
    "overall_survival_months",
    "overall_survival_status",
    "tumor_stage"
]

# Step 4: Remove missing values
df = df.dropna()

# Step 5: Convert columns to numeric
df["age_at_diagnosis"] = pd.to_numeric(df["age_at_diagnosis"], errors="coerce")
df["tumor_size"] = pd.to_numeric(df["tumor_size"], errors="coerce")
df["overall_survival_months"] = pd.to_numeric(df["overall_survival_months"], errors="coerce")

# Remove rows that became NaN after conversion
df = df.dropna()

# Step 6: Create Age Group feature
def create_age_group(age):
    if age < 40:
        return "Under 40"
    elif age <= 55:
        return "40-55"
    elif age <= 70:
        return "56-70"
    else:
        return "70+"

df["Age_Group"] = df["age_at_diagnosis"].apply(create_age_group)

# Step 7: Check distribution
print(df["Age_Group"].value_counts())

# Step 8: Save cleaned dataset
df.to_csv("cleaned_data.csv", index=False)

print("Cleaning completed successfully!")