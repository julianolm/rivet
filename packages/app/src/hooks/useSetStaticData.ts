import { useAtom } from 'jotai';
import { useStaticDataDatabase } from './useStaticDataDatabase';
import { projectDataState } from '../state/savedGraphs';
import { type DataId } from '@ironclad/rivet-core';
import { entries } from '../../../core/src/utils/typeSafety';

export function useSetStaticData() {
  const [projectData, setProjectData] = useAtom(projectDataState);
  const database = useStaticDataDatabase();

  return async (data: Record<DataId, string>) => {
    setProjectData({
      ...projectData,
      ...data,
    });

    for (const [id, dataValue] of entries(data)) {
      try {
        await database.insert(id, dataValue);
      } catch (err) {
        console.error(err);
      }
    }
  };
}
