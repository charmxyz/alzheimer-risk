'use client'

import { StackedLayout } from '@/components/stacked-layout'
import { Navbar, NavbarItem, NavbarLabel, NavbarDivider } from '@/components/navbar'
import { Button } from '@/components/button'
import Image from 'next/image'
import { useState } from 'react'
import { Dialog } from '@headlessui/react'

const TEST_OPTIONS = [
  {
    name: 'Plasma pTau217',
    threshold: 0.22,
    positiveLR: 7.1,
    negativeLR: 0.1,
    source: 'Palmqvist S, et al. (2020) - JAMA',
    sourceUrl: 'https://jamanetwork.com/journals/jama/fullarticle/2768841'
  },
  {
    name: 'CSF AB 42:40 ratio',
    threshold: 0.067,
    positiveLR: 4.2,
    negativeLR: 0.2,
    source: 'Based on performance relative to amyloid PET positivity, Baldeiras I, et al. (2018) - Alzheimers Research & Therapy',
    sourceUrl: 'https://alzres.biomedcentral.com/articles/10.1186/s13195-018-0362-2'
  }
]

interface CalculationDetails {
  baselineProbability: number
  clinicalProbability: number
  testName: string
  positiveProbability: number
  negativeProbability: number
  positiveChange: number
  negativeChange: number
  positiveLR: number
  negativeLR: number
}

const initialSteps = [
  { id: 'Step 1', name: 'Input age', href: '#', status: 'current' },
  { id: 'Step 2', name: 'Adjust risk', href: '#', status: 'upcoming' },
  { id: 'Step 3', name: 'Choose test', href: '#', status: 'upcoming' },
]

export default function Home() {
  const [step, setStep] = useState(0)
  const [age, setAge] = useState("")
  const [probability, setProbability] = useState(0)
  const [selectedTest, setSelectedTest] = useState("")
  const [calculationDetails, setCalculationDetails] = useState<CalculationDetails | null>(null)
  const [editingLR, setEditingLR] = useState<"positive" | "negative" | null>(null)
  const [tempPositiveLR, setTempPositiveLR] = useState("")
  const [tempNegativeLR, setTempNegativeLR] = useState("")
  const [isPopupOpen, setIsPopupOpen] = useState(false)
  const [isUserModified, setIsUserModified] = useState(false)
  const [originalLR, setOriginalLR] = useState<{positive: number, negative: number} | null>(null)

  const getBaselineProbability = (age: number): number => {
    if (age <= 64) return 0.9;
    if (age <= 69) return 1.7;
    if (age <= 74) return 3.3;
    if (age <= 79) return 8.0;
    if (age <= 84) return 12.1;
    if (age <= 89) return 21.9;
    return 40.8;
  }

  const calculatePostTestProbability = (preTestProbability: number, likelihoodRatio: number): number => {
    const preTestOdds = preTestProbability / (1 - preTestProbability)
    const postTestOdds = preTestOdds * likelihoodRatio
    return postTestOdds / (1 + postTestOdds)
  }

  const handleEditLR = (type: "positive" | "negative") => {
    setEditingLR(type)
    if (type === "positive") {
      setTempPositiveLR(calculationDetails?.positiveLR.toString() || "")
    } else {
      setTempNegativeLR(calculationDetails?.negativeLR.toString() || "")
    }
  }

  const handleSaveLR = (type: "positive" | "negative") => {
    if (!calculationDetails) return

    const newLR = type === "positive" ? parseFloat(tempPositiveLR) : parseFloat(tempNegativeLR)
    if (isNaN(newLR)) return

    const test = TEST_OPTIONS.find(t => t.name === calculationDetails.testName)
    if (!test) return

    // Store original values if this is the first modification
    if (!isUserModified) {
      setOriginalLR({
        positive: test.positiveLR,
        negative: test.negativeLR
      })
      setIsUserModified(true)
    }

    const clinicalProb = probability / 100
    const positiveProb = type === "positive" 
      ? calculatePostTestProbability(clinicalProb, newLR)
      : calculatePostTestProbability(clinicalProb, test.positiveLR)
    const negativeProb = type === "negative"
      ? calculatePostTestProbability(clinicalProb, newLR)
      : calculatePostTestProbability(clinicalProb, test.negativeLR)

    setCalculationDetails({
      ...calculationDetails,
      positiveLR: type === "positive" ? newLR : calculationDetails.positiveLR,
      negativeLR: type === "negative" ? newLR : calculationDetails.negativeLR,
      positiveProbability: positiveProb,
      negativeProbability: negativeProb,
      positiveChange: positiveProb - clinicalProb,
      negativeChange: negativeProb - clinicalProb
    })
    setEditingLR(null)
  }

  const resetLRValues = () => {
    if (!calculationDetails || !originalLR) return
    
    const test = TEST_OPTIONS.find(t => t.name === calculationDetails.testName)
    if (!test) return

    const clinicalProb = probability / 100
    const positiveProb = calculatePostTestProbability(clinicalProb, originalLR.positive)
    const negativeProb = calculatePostTestProbability(clinicalProb, originalLR.negative)

    setCalculationDetails({
      ...calculationDetails,
      positiveLR: originalLR.positive,
      negativeLR: originalLR.negative,
      positiveProbability: positiveProb,
      negativeProbability: negativeProb,
      positiveChange: positiveProb - clinicalProb,
      negativeChange: negativeProb - clinicalProb
    })
    
    setIsUserModified(false)
    setOriginalLR(null)
  }

  const calculateRisk = () => {
    if (!age || !selectedTest) return

    const ageNum = parseInt(age)
    const baselineProb = getBaselineProbability(ageNum)
    const clinicalProb = probability / 100

    const test = TEST_OPTIONS.find(t => t.name === selectedTest)
    if (!test) return

    const positiveProb = calculatePostTestProbability(clinicalProb, test.positiveLR)
    const negativeProb = calculatePostTestProbability(clinicalProb, test.negativeLR)

    setCalculationDetails({
      baselineProbability: baselineProb,
      clinicalProbability: clinicalProb,
      testName: test.name,
      positiveProbability: positiveProb,
      negativeProbability: negativeProb,
      positiveChange: positiveProb - clinicalProb,
      negativeChange: negativeProb - clinicalProb,
      positiveLR: test.positiveLR,
      negativeLR: test.negativeLR
    })
  }

  const handleNext = () => {
    if (step === 0 && age) {
      setProbability(getBaselineProbability(parseInt(age)))
    }
    setStep((prev) => Math.min(prev + 1, 2))
  }

  const handleReset = () => {
    setStep(0)
    setAge("")
    setProbability(0)
    setSelectedTest("")
    setCalculationDetails(null)
  }

  // Update steps based on current step
  const steps = initialSteps.map((s, index) => ({
    ...s,
    status: index < step ? 'complete' : index === step ? 'current' : 'upcoming'
  }))

  return (
    <StackedLayout
      navbar={
        <Navbar>
          <NavbarItem href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Cogni" width={24} height={24} />
            <NavbarLabel className="text-[#2D5CF2] font-extrabold">Cogni</NavbarLabel>
            <div aria-hidden="true" className="mx-1 h-6 w-px bg-zinc-950/10 light:bg-white/10"></div>
            <NavbarLabel className="text-[#404040]">Alzheimers Disease Risk Calculator</NavbarLabel>
          </NavbarItem>
          <NavbarItem className="ml-auto hidden md:block">
            <Button color="light" onClick={() => window.location.href = 'mailto:sf1123@ic.ac.uk'}>Send feedback</Button>
          </NavbarItem>
        </Navbar>
      }
      sidebar={<div className="hidden md:block">Sidebar content</div>}
    >
      <div className="space-y-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            Important Notice: This tool is intended to help indicate whether biomarkers for Alzheimers disease would be clinically helpful. It is designed for educational purposes only and is not approved for clinical use in patients. The results should not be used to make clinical decisions.
          </p>
        </div>

        <nav aria-label="Progress">
          <ol role="list" className="space-y-4 md:flex md:space-y-0 md:space-x-8">
            {steps.map((step) => (
              <li key={step.name} className="md:flex-1">
                {step.status === 'complete' ? (
                  <a
                    href={step.href}
                    className="group flex flex-col border-l-4 border-blue-600 py-2 pl-4 hover:border-blue-800 md:border-t-4 md:border-l-0 md:pt-4 md:pb-0 md:pl-0"
                  >
                    <span className="text-sm font-medium text-blue-600 group-hover:text-blue-800">{step.id}</span>
                    <span className="text-sm font-medium text-gray-500">{step.name}</span>
                  </a>
                ) : step.status === 'current' ? (
                  <a
                    href={step.href}
                    aria-current="step"
                    className="flex flex-col border-l-4 border-blue-600 py-2 pl-4 md:border-t-4 md:border-l-0 md:pt-4 md:pb-0 md:pl-0"
                  >
                    <span className="text-sm font-medium text-blue-600">{step.id}</span>
                    <span className="text-sm font-medium text-gray-500">{step.name}</span>
                  </a>
                ) : (
                  <a
                    href={step.href}
                    className="group flex flex-col border-l-4 border-gray-200 py-2 pl-4 hover:border-gray-300 md:border-t-4 md:border-l-0 md:pt-4 md:pb-0 md:pl-0"
                  >
                    <span className="text-sm font-medium text-gray-500 group-hover:text-gray-700">{step.id}</span>
                    <span className="text-sm font-medium text-gray-500">{step.name}</span>
                  </a>
                )}
              </li>
            ))}
          </ol>
        </nav>

        <div className="space-y-4 md:flex md:space-y-0 md:space-x-8">
          {/* Step 1: Patient Age */}
          <div className="md:flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Patient Age</label>
            {step > 0 ? (
              <div className="relative flex h-10 w-full">
                <input
                  type="number"
                  value={age}
                  disabled
                  className="peer h-full w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 font-sans text-sm font-normal text-gray-700 outline outline-0 transition-all disabled:border-0 disabled:bg-gray-100"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-black"
                  placeholder="Enter age"
                />
                <Button 
                  color="blue" 
                  className="w-full" 
                  onClick={handleNext}
                  disabled={!age}
                >
                  Next
                </Button>
              </div>
            )}
          </div>

          {/* Step 2: Slider */}
          <div className="md:flex-1">
            {step >= 1 && (
              <>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Clinical assessment of Alzheimers disease probability
                </label>
                {step === 1 ? (
                  <div className="space-y-2">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={probability}
                      onChange={(e) => setProbability(Number(e.target.value))}
                      className="w-full text-black"
                    />
                    <div className="text-sm text-center text-black">{probability}%</div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        {getBaselineProbability(parseInt(age))}% population risk
                      </span>
                      <Button 
                        color="light" 
                        onClick={() => setIsPopupOpen(true)}
                        className="border border-gray-300"
                      >
                        See detail
                      </Button>
                    </div>
                    <Button 
                      color="blue" 
                      className="w-full" 
                      onClick={calculationDetails ? calculateRisk : handleNext}
                      disabled={!probability}
                    >
                      {calculationDetails ? 'Calculate' : 'Next'}
                    </Button>
                  </div>
                ) : (
                  <div className="relative flex h-10 w-full">
                    <div className="peer h-full w-full rounded-md border-0 bg-gray-100 px-3 py-2 font-sans text-sm font-normal text-gray-700 outline outline-0 transition-all">
                      {probability}%
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Step 3: Dropdown */}
          <div className="md:flex-1">
            {step >= 2 && (
              <>
                <label className="block text-sm font-medium text-gray-700 mb-1">Choose biomarker test</label>
                {calculationDetails ? (
                  <div className="relative flex h-10 w-full text-black">
                    <select
                      value={selectedTest}
                      disabled
                      className="peer h-full w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 font-sans text-sm font-normal text-gray-700 outline outline-0 transition-all disabled:border-0 disabled:bg-gray-100"
                    >
                      <option value="">Select a test</option>
                      {TEST_OPTIONS.map((test) => (
                        <option key={test.name} value={test.name}>{test.name}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <select
                      value={selectedTest}
                      onChange={(e) => setSelectedTest(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-black"
                    >
                      <option value="">Select a test</option>
                      {TEST_OPTIONS.map((test) => (
                        <option key={test.name} value={test.name}>{test.name}</option>
                      ))}
                    </select>
                    <Button 
                      color="blue" 
                      className="w-full" 
                      onClick={calculateRisk}
                      disabled={!selectedTest}
                    >
                      Calculate
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Results Display */}
        {calculationDetails && (
          <div className="mt-8 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-black">What might this test tell me?</h2>
              <Button color="light" onClick={handleReset} className="w-32">Start Again</Button>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6 space-y-6">
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-medium mb-2 text-black">If the test is positive:</h3>
                  <div className="text-3xl font-bold text-green-600">
                    {(calculationDetails.positiveProbability * 100).toFixed(1)}%
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    {calculationDetails.positiveProbability >= 0.95 
                      ? "This result is sufficient to confidently confirm Alzheimers disease (using threshold of 95%)"
                      : "This result is not sufficient to confidently confirm Alzheimers disease (using threshold of 95%)"
                    }
                  </p>
                </div>

                <div className="text-center">
                  <h3 className="text-lg font-medium mb-2 text-black">If the test is negative:</h3>
                  <div className="text-3xl font-bold text-red-600">
                    {(calculationDetails.negativeProbability * 100).toFixed(1)}%
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    {calculationDetails.negativeProbability <= 0.015
                      ? "This result is sufficient to confidently rule out Alzheimers disease (using threshold of 1.5%)"
                      : "This result is not sufficient to confidently rule out Alzheimers disease (using threshold of 1.5%)"
                    }
                  </p>
                </div>
              </div>

              {/* Visual Probability Slider */}
              <div className="w-full px-4 py-6 mb-12">
                <div className="relative w-full h-2 bg-gray-200 rounded-full">
                  {/* Clinical Risk Marker */}
                  <div 
                    className="absolute h-4 w-1 bg-blue-500 rounded-full -mt-1"
                    style={{ 
                      left: `${calculationDetails.clinicalProbability * 100}%`,
                      transform: 'translateX(-50%)'
                    }}
                  >
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-blue-500">
                      Clinical
                    </div>
                  </div>

                  {/* Negative Result Marker */}
                  <div 
                    className="absolute h-4 w-1 bg-red-500 rounded-full -mt-1"
                    style={{ 
                      left: `${calculationDetails.negativeProbability * 100}%`,
                      transform: 'translateX(-50%)'
                    }}
                  >
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-red-500">
                      Negative
                    </div>
                  </div>

                  {/* Positive Result Marker */}
                  <div 
                    className="absolute h-4 w-1 bg-green-500 rounded-full -mt-1"
                    style={{ 
                      left: `${calculationDetails.positiveProbability * 100}%`,
                      transform: 'translateX(-50%)'
                    }}
                  >
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-green-500">
                      Positive
                    </div>
                  </div>

                  {/* Scale markers */}
                  <div className="absolute w-full flex justify-between text-xs text-gray-400 mt-6">
                    <span>0%</span>
                    <span>25%</span>
                    <span>50%</span>
                    <span>75%</span>
                    <span>100%</span>
                  </div>
                  
                  {/* Corner labels */}
                  <div className="absolute -left-2 top-10 text-xs text-gray-500 font-medium">
                    Definitely absent
                  </div>
                  <div className="absolute -right-2 top-10 text-xs text-gray-500 font-medium">
                    Definitely present
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium mb-4 text-black">Calculation Details</h3>
                <div className="space-y-4 bg-[#FAFAFA] p-6 rounded-lg">
                  <div>
                    <h4 className="font-medium mb-2 text-black">Test Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 bg-white p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Positive Test Strength (LR+)</span>
                          {editingLR === "positive" ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                value={tempPositiveLR}
                                onChange={(e) => setTempPositiveLR(e.target.value)}
                                className="w-20 border border-gray-300 rounded px-2 py-1 text-black"
                              />
                              <Button color="blue" onClick={() => handleSaveLR("positive")}>Save</Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-black">
                              <span className="font-medium">{calculationDetails.positiveLR.toFixed(2)}</span>
                              <Button color="light" onClick={() => handleEditLR("positive")}>Edit</Button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2 bg-white p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Negative Test Strength (LR-)</span>
                          {editingLR === "negative" ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                value={tempNegativeLR}
                                onChange={(e) => setTempNegativeLR(e.target.value)}
                                className="w-20 border border-gray-300 rounded px-2 py-1 text-black"
                              />
                              <Button color="blue" onClick={() => handleSaveLR("negative")}>Save</Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-black">
                              <span className="font-medium">{calculationDetails.negativeLR.toFixed(2)}</span>
                              <Button color="light" onClick={() => handleEditLR("negative")}>Edit</Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 bg-white p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Source</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">
                            {isUserModified 
                              ? "User change manually likelyhood ratio value" 
                              : TEST_OPTIONS.find(t => t.name === calculationDetails.testName)?.source}
                          </span>
                          <Button 
                            color="light" 
                            onClick={isUserModified ? resetLRValues : () => window.open(TEST_OPTIONS.find(t => t.name === calculationDetails.testName)?.sourceUrl, '_blank')}
                          >
                            {isUserModified ? "Reset LR value" : "Visit"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2 text-black">Post-Test Probabilities</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">If Test is Positive:</span>
                          <div className="flex items-center gap-2 text-black">
                            <span className="font-medium">
                              {(calculationDetails.positiveProbability * 100).toFixed(1)}%
                            </span>
                            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-0.5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                              </svg>
                              {(calculationDetails.positiveChange * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">If Test is Negative:</span>
                          <div className="flex items-center gap-2 text-black">
                            <span className="font-medium">
                              {(calculationDetails.negativeProbability * 100).toFixed(1)}%
                            </span>
                            <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-0.5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              {Math.abs(calculationDetails.negativeChange * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-lg">
                    <h4 className="font-medium mb-2 text-gray-600">How We Calculate the Results</h4>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p>1. We start with the pre-test probability: {(calculationDetails.clinicalProbability * 100).toFixed(1)}%</p>
                      <p>2. Convert to odds: {(calculationDetails.clinicalProbability * 100).toFixed(1)}% / (1 - {(calculationDetails.clinicalProbability * 100).toFixed(1)}%)</p>
                      <p>3. Multiply by the test likelihood ratio: × {calculationDetails.positiveLR.toFixed(2)}</p>
                      <p>4. Convert back to probability: odds / (1 + odds)</p>
                      <p className="mt-2">
                        This gives us the final probability of {(calculationDetails.positiveProbability * 100).toFixed(1)}% if the test is positive.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <p className="text-sm text-gray-600">
                  This tool is for educational purposes only and is not approved for clinical use.
                  The calculations are based on published likelihood ratios and may not reflect individual patient circumstances.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Population Risk Popup */}
        <Dialog
          open={isPopupOpen}
          onClose={() => setIsPopupOpen(false)}
          className="relative z-50"
        >
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="mx-auto w-full max-w-md rounded bg-white p-6">
              <Dialog.Title className="text-lg font-medium mb-4 text-black">
                Population Risk by Age
              </Dialog.Title>
              <div className="space-y-2 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Age Group</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Prevalence Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="px-4 py-2 text-sm text-gray-600">Under 64 years</td>
                      <td className="px-4 py-2 text-sm text-gray-600">0.9%</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm text-gray-600">65–69 years</td>
                      <td className="px-4 py-2 text-sm text-gray-600">1.7%</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm text-gray-600">70–74 years</td>
                      <td className="px-4 py-2 text-sm text-gray-600">3.3%</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm text-gray-600">75–79 years</td>
                      <td className="px-4 py-2 text-sm text-gray-600">8.0%</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm text-gray-600">80–84 years</td>
                      <td className="px-4 py-2 text-sm text-gray-600">12.1%</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm text-gray-600">85–89 years</td>
                      <td className="px-4 py-2 text-sm text-gray-600">21.9%</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm text-gray-600">90+ years</td>
                      <td className="px-4 py-2 text-sm text-gray-600">40.8%</td>
                    </tr>
                  </tbody>
                </table>
                <div className="mt-4 text-sm text-gray-600">
                  Source: Stevenson-Hoare J, Schalkamp A-K, Sandor C, Hardy J, Escott-Price V. New cases of dementia are rising in elderly populations in Wales, UK. Journal of the Neurological Sciences. 2023;451:120715. https://doi.org/10.1016/j.jns.2023.120715
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <Button 
                  color="dark" 
                  onClick={() => setIsPopupOpen(false)}
                  className="w-full sm:w-auto bg-black text-white hover:bg-gray-800"
                >
                  Close
                </Button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
    </div>
    </StackedLayout>
  )
}
