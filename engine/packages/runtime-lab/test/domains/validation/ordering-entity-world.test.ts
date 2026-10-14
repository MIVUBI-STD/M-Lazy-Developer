import {describe,expect,it} from "vitest";
import {createPlayerLifeOrderingExperiment,createEntityTickOrderingExperiment} from "../../../src/domains/ordering/event-ordering-validation-experiments.js";
import {createEffectStateExperiment,createHealthReconciliationExperiment} from "../../../src/domains/entity/entity-state-validation-experiments.js";
import {createSetBlockReadinessExperiment,createStructurePlacementExperiment} from "../../../src/domains/world/world-mutation-validation-experiments.js";
import {validateRuntimeExperimentDefinition} from "../../../src/index.js";
const common={id:"x",title:"x",targetProfileFingerprint:"p",fixtureFingerprint:"f"};
describe("runtime validation batch",()=>{it("builds valid ordering/entity/world definitions",()=>{const e={...common,objectiveId:"o",participant:"p"};const w={...common,dimension:"overworld",x:0,y:64,z:0};for(const d of [createPlayerLifeOrderingExperiment(e),createEntityTickOrderingExperiment(e),createEffectStateExperiment(e),createHealthReconciliationExperiment(e),createSetBlockReadinessExperiment(w),createStructurePlacementExperiment(w)])expect(validateRuntimeExperimentDefinition(d)).toEqual([]);});});
