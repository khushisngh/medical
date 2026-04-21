import React, { useState } from 'react';
import { Utensils, Moon, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface HealthPlanData {
  diet_plan: {
    caloric_intake?: number;
    daily_calories?: number;
    macronutrients?: {
      carbohydrates: string | number;
      proteins: string | number;
      fats: string | number;
    };
    macronutrient_ratio?: {
      carbohydrates: string | number;
      protein?: string | number;
      proteins?: string | number;
      fats: string | number;
    };
    meal_plan?: {
      [key: string]: {
        time: string;
        items: string[];
      };
    };
    breakfast?: string[] | { meal?: string };
    lunch?: string[] | { meal?: string };
    dinner?: string[] | { meal?: string };
    snacks?: string[] | Array<{ snack?: string }>;
    sleep_routine?: {
      bedtime?: string;
      wake_time?: string;
      wake_up_time?: string;
      pre_sleep_activities?: string[];
      sleep_quality_tips?: string[];
      tips?: string[];
    };
  };
  sleep_routine: {
    bedtime?: string;
    wake_time?: string;
    wake_up_time?: string;
    pre_sleep_activities?: string[];
    sleep_quality_tips?: string[];
    tips?: string[];
  };
}

const HealthPlans: React.FC = () => {
  const [formData, setFormData] = useState({
    age: '',
    weight: '',
    height: '',
    activityLevel: '',
    dietaryRestrictions: '',
    sleepIssues: ''
  });
  const [healthPlan, setHealthPlan] = useState<HealthPlanData | null>(null);
  const [healthPlanText, setHealthPlanText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const toMealItems = (value: unknown): string[] => {
    if (Array.isArray(value)) {
      return value.map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && 'snack' in item) {
          return String((item as { snack?: string }).snack || '').trim();
        }
        return '';
      }).filter(Boolean);
    }
    if (value && typeof value === 'object' && 'meal' in value) {
      const meal = (value as { meal?: string }).meal;
      return meal ? [meal] : [];
    }
    return [];
  };

  const normalizeMealPlan = (mealPlan: unknown) => {
    const source = mealPlan && typeof mealPlan === 'object' ? (mealPlan as Record<string, unknown>) : {};
    const normalizeEntry = (label: string, rawValue: unknown) => {
      if (rawValue && typeof rawValue === 'object' && 'items' in (rawValue as Record<string, unknown>)) {
        const typed = rawValue as { time?: string; items?: unknown };
        return {
          time: typed.time || label,
          items: toMealItems(typed.items)
        };
      }
      return {
        time: label,
        items: toMealItems(rawValue)
      };
    };

    return {
      breakfast: normalizeEntry('Breakfast', source.breakfast),
      lunch: normalizeEntry('Lunch', source.lunch),
      dinner: normalizeEntry('Dinner', source.dinner),
      snacks: normalizeEntry('Snacks', source.snacks)
    };
  };

  const extractJsonObject = (value: string): string => {
    const cleaned = value.replace(/```json\s?|\s?```/g, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return cleaned;
    return cleaned.slice(start, end + 1);
  };

  const normalizeHealthPlan = (rawPlan: HealthPlanData): HealthPlanData => {
    const rawSleepRoutine = rawPlan.sleep_routine || rawPlan.diet_plan?.sleep_routine || {};
    return {
      ...rawPlan,
      diet_plan: {
        ...rawPlan.diet_plan,
        caloric_intake: rawPlan.diet_plan?.caloric_intake ?? rawPlan.diet_plan?.daily_calories,
        macronutrients: rawPlan.diet_plan?.macronutrients ?? (rawPlan.diet_plan?.macronutrient_ratio ? {
          carbohydrates: rawPlan.diet_plan.macronutrient_ratio.carbohydrates,
          proteins: rawPlan.diet_plan.macronutrient_ratio.proteins ?? rawPlan.diet_plan.macronutrient_ratio.protein ?? '',
          fats: rawPlan.diet_plan.macronutrient_ratio.fats
        } : undefined),
        meal_plan: rawPlan.diet_plan?.meal_plan
          ? normalizeMealPlan(rawPlan.diet_plan.meal_plan)
          : normalizeMealPlan({
              breakfast: rawPlan.diet_plan?.breakfast,
              lunch: rawPlan.diet_plan?.lunch,
              dinner: rawPlan.diet_plan?.dinner,
              snacks: rawPlan.diet_plan?.snacks
            })
      },
      sleep_routine: {
        ...rawSleepRoutine,
        bedtime: rawSleepRoutine?.bedtime ?? 'Not specified',
        wake_time: rawSleepRoutine?.wake_time ?? rawSleepRoutine?.wake_up_time ?? 'Not specified',
        pre_sleep_activities:
          rawSleepRoutine?.pre_sleep_activities ??
          rawSleepRoutine?.sleep_quality_tips ??
          rawSleepRoutine?.tips ??
          []
      }
    };
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prevData => ({ ...prevData, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setHealthPlan(null);
    setHealthPlanText(null);

    try {
      const response = await fetch('http://localhost:3001/api/HealthPlans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Server error');
      }

      console.log('Received data:', data);
      if (data.healthPlanText) {
        try {
          const parsedTextPlan = JSON.parse(extractJsonObject(data.healthPlanText)) as HealthPlanData;
          setHealthPlan(normalizeHealthPlan(parsedTextPlan));
        } catch (_parseError) {
          setHealthPlanText(data.healthPlanText);
        }
        return;
      }
      const rawPlan = data.healthPlan as HealthPlanData;
      setHealthPlan(normalizeHealthPlan(rawPlan));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred while processing your request. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header and other components ... */}

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-blue-800 mb-8 text-center">Personalized Health Plans</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold text-blue-700 mb-4">Health Questionnaire</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="age" className="block text-sm font-medium text-gray-700">Age</label>
              <input
                type="number"
                id="age"
                name="age"
                value={formData.age}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
                min="1"
                max="120"
              />
            </div>
            <div>
              <label htmlFor="weight" className="block text-sm font-medium text-gray-700">Weight (kg)</label>
              <input
                type="number"
                id="weight"
                name="weight"
                value={formData.weight}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
                min="1"
                max="500"
                step="0.1"
              />
            </div>
            <div>
              <label htmlFor="height" className="block text-sm font-medium text-gray-700">Height (cm)</label>
              <input
                type="number"
                id="height"
                name="height"
                value={formData.height}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
                min="1"
                max="300"
              />
            </div>
            <div>
              <label htmlFor="activityLevel" className="block text-sm font-medium text-gray-700">Activity Level</label>
              <select
                id="activityLevel"
                name="activityLevel"
                value={formData.activityLevel}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              >
                <option value="">Select an option</option>
                <option value="sedentary">Sedentary</option>
                <option value="lightly active">Lightly Active</option>
                <option value="moderately active">Moderately Active</option>
                <option value="very active">Very Active</option>
                <option value="extra active">Extra Active</option>
              </select>
            </div>
            <div>
              <label htmlFor="dietaryRestrictions" className="block text-sm font-medium text-gray-700">Dietary Restrictions</label>
              <input
                type="text"
                id="dietaryRestrictions"
                name="dietaryRestrictions"
                value={formData.dietaryRestrictions}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="e.g., vegetarian, gluten-free, nut allergy"
              />
            </div>
            <div>
              <label htmlFor="sleepIssues" className="block text-sm font-medium text-gray-700">Sleep Issues</label>
              <textarea
                id="sleepIssues"
                name="sleepIssues"
                value={formData.sleepIssues}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                rows={3}
                placeholder="Describe any sleep issues you're experiencing"
              ></textarea>
            </div>
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-full text-white font-semibold ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600'
              } transition duration-300`}
            >
              {loading ? 'Generating...' : 'Generate Health Plan'}
            </button>
          </form>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <AlertCircle className="h-4 w-4 inline mr-2" />
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {healthPlan && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-blue-700 mb-4">Your Personalized Health Plan</h2>
            
            {healthPlan.diet_plan && (
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-blue-600 mb-3 flex items-center">
                  <Utensils className="mr-2" /> Diet Plan
                </h3>
                <p>Caloric Intake: {healthPlan.diet_plan.caloric_intake ?? 'Not specified'} calories</p>
                {healthPlan.diet_plan.macronutrients && (
                  <>
                    <h4 className="text-lg font-semibold mt-2">Macronutrients:</h4>
                    <ul className="list-disc list-inside text-gray-700">
                      <li>Carbohydrates: {healthPlan.diet_plan.macronutrients.carbohydrates}</li>
                      <li>Proteins: {healthPlan.diet_plan.macronutrients.proteins}</li>
                      <li>Fats: {healthPlan.diet_plan.macronutrients.fats}</li>
                    </ul>
                  </>
                )}
                {healthPlan.diet_plan.meal_plan && (
                  <>
                    <h4 className="text-lg font-semibold mt-2">Meal Plan:</h4>
                    {Object.entries(healthPlan.diet_plan.meal_plan).map(([meal, details]) => (
                      <div key={meal} className="mt-2">
                        <h5 className="font-semibold capitalize">{meal} ({details.time}):</h5>
                        <ul className="list-disc list-inside text-gray-700">
                          {details.items.map((item, index) => (
                            <li key={index}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
            
            {healthPlan.sleep_routine && typeof healthPlan.sleep_routine === 'object' && Array.isArray(healthPlan.sleep_routine.pre_sleep_activities) && (
              <div>
                <h3 className="text-xl font-semibold text-blue-600 mb-3 flex items-center">
                  <Moon className="mr-2" /> Sleep Routine
                </h3>
                <p>Bedtime: {healthPlan.sleep_routine.bedtime ?? 'Not specified'}</p>
                <p>Wake Time: {healthPlan.sleep_routine.wake_time ?? 'Not specified'}</p>
                <h4 className="text-lg font-semibold mt-2">Pre-sleep Activities:</h4>
                {healthPlan.sleep_routine.pre_sleep_activities.length > 0 ? (
                  <ul className="list-disc list-inside text-gray-700">
                    {healthPlan.sleep_routine.pre_sleep_activities.map((activity, index) => (
                      <li key={index}>{activity}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-700">Not specified</p>
                )}
              </div>
            )}
          </div>
        )}

        {healthPlanText && (
          <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
            <h2 className="text-2xl font-semibold text-blue-700 mb-4">Your Personalized Health Plan (Text)</h2>
            <pre className="whitespace-pre-wrap text-gray-800 text-sm bg-gray-50 p-4 rounded border border-gray-200">
              {healthPlanText}
            </pre>
          </div>
        )}
      </main>

      {/* Footer ... */}
    </div>
  );
};

export default HealthPlans;