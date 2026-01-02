
import React from 'react';
import { OperatorType } from './types';

export const OPERATOR_THEMES: Record<OperatorType, { color: string; icon: React.ReactNode }> = {
  [OperatorType.JR_EAST]: {
    color: 'bg-green-600',
    icon: (
      <div className="w-8 h-8 flex items-center justify-center bg-white text-green-600 font-bold rounded">
        JR
      </div>
    )
  },
  [OperatorType.TOKYO_METRO]: {
    color: 'bg-blue-500',
    icon: (
      <div className="w-8 h-8 flex items-center justify-center bg-white text-blue-500 font-bold rounded-full border-2 border-blue-500">
        M
      </div>
    )
  },
  [OperatorType.SOTETSU]: {
    color: 'bg-blue-900',
    icon: (
      <div className="w-8 h-8 flex items-center justify-center bg-white text-blue-900 font-bold rounded-sm">
        S
      </div>
    )
  },
  [OperatorType.CUSTOM]: {
    color: 'bg-gray-700',
    icon: (
      <div className="w-8 h-8 flex items-center justify-center bg-white text-gray-700 font-bold rounded-full">
        ?
      </div>
    )
  }
};

export const SCRIPTS = {
  [OperatorType.JR_EAST]: {
    // Station numbers are typically NOT voiced in Japanese train announcements.
    jp: (station: string, _number: string, door: string, transfers: string) => 
      `次は、${station}、${station}です。お出口は${door}側です。${transfers ? transfers + 'はお乗り換えです。' : ''}`,
    en: (station: string, _number: string, door: string, transfers: string) => 
      `The next station is ${station}. The doors on the ${door} side will open. ${transfers ? 'Please change here for the ' + transfers + '.' : ''}`
  },
  [OperatorType.TOKYO_METRO]: {
    jp: (station: string, _number: string, door: string, transfers: string) => 
      `まもなく、${station}、${station}です。お出口は${door}側です。${transfers ? transfers + 'はお乗り換えです。' : ''}`,
    en: (station: string, _number: string, door: string, transfers: string) => 
      `Arriving at ${station}. The doors on the ${door} side will open. ${transfers ? 'Please change here for the ' + transfers + '.' : ''}`
  },
  [OperatorType.SOTETSU]: {
    jp: (station: string, _number: string, door: string, transfers: string) => 
      `次は、${station}、${station}です。お出口は${door}側です。${transfers ? transfers + 'はお乗り換えです。' : ''}`,
    en: (station: string, _number: string, door: string, transfers: string) => 
      `The next station is ${station}. The doors on the ${door} side will open. ${transfers ? 'Passengers changing to the ' + transfers + ', please change here.' : ''}`
  },
  [OperatorType.CUSTOM]: {
    jp: (station: string, number: string, door: string, transfers: string) => 
      `${station}。${number ? '駅番号 ' + number + '。' : ''}${door}側。${transfers}`,
    en: (station: string, number: string, door: string, transfers: string) => 
      `${station}. ${number ? 'Station number ' + number + '. ' : ''}${door} side. ${transfers}`
  }
};
