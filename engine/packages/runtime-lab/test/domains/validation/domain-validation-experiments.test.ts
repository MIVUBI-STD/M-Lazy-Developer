import {describe,expect,it} from "vitest";
import {createAiCompatibilityExperiment,createLootRuntimeExperiment,createPhysicsCompatibilityExperiment,createStateHandleValidityExperiment} from "../../../src/domains/validation/domain-validation-experiments.js";
import {validateRuntimeExperimentDefinition} from "../../../src/index.js";
const b={id:"d",title:"d",targetProfileFingerprint:"p",fixtureFingerprint:"f",objectiveId:"o",participant:"p"};
describe("domain validation experiments",()=>{it("builds valid domain families",()=>{for(const d of [createAiCompatibilityExperiment(b),createLootRuntimeExperiment(b),createPhysicsCompatibilityExperiment(b),createStateHandleValidityExperiment(b)])expect(validateRuntimeExperimentDefinition(d)).toEqual([]);});});
