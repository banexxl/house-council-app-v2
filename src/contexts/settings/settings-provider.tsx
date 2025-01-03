import { FC, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import isEqual from 'lodash.isequal';

import type { Settings } from 'src/types/settings';
import type { State } from './settings-context';
import { defaultSettings, initialState, SettingsContext } from './settings-context';

interface SettingsProviderProps {
  children?: ReactNode;
  onReset?: () => void;
  onUpdate?: (settings: Settings) => void;
  settings?: Settings;
}

export const SettingsProvider: FC<SettingsProviderProps> = (props) => {
  const { children, onReset, onUpdate, settings: initialSettings } = props;
  const [state, setState] = useState<State>(initialState);
  const [settings, setSettings] = useState<Settings>(() => ({
    ...defaultSettings,
    ...initialSettings,
  }));

  useEffect(() => {
    setState((prevState) => ({
      ...prevState,
      isInitialized: true,
    }));
  }, []);

  const handleUpdate = useCallback(
    (newSettings: Partial<Settings>): void => {
      setSettings((prevSettings) => {
        const updatedSettings = {
          ...prevSettings,
          ...newSettings,
        };
        if (onUpdate) {
          onUpdate(updatedSettings);
        }
        return updatedSettings;
      });
    },
    [onUpdate]
  );

  const handleDrawerOpen = useCallback(() => {
    setState((prevState) => ({
      ...prevState,
      openDrawer: true,
    }));
  }, []);

  const handleDrawerClose = useCallback(() => {
    setState((prevState) => ({
      ...prevState,
      openDrawer: false,
    }));
  }, []);

  const handleReset = useCallback(() => {
    setSettings(defaultSettings);
    if (onReset) {
      onReset();
    }
  }, [onReset]);

  const isCustom = useMemo(() => {
    return !isEqual(defaultSettings, settings);
  }, [settings]);

  const contextValue = useMemo(() => ({
    ...settings,
    ...state,
    handleDrawerClose,
    handleDrawerOpen,
    handleReset,
    handleUpdate,
    isCustom,
  }), [settings, state, handleDrawerClose, handleDrawerOpen, handleReset, handleUpdate, isCustom]);

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
};

SettingsProvider.propTypes = {
  children: PropTypes.element,
  onReset: PropTypes.func,
  onUpdate: PropTypes.func,
  settings: PropTypes.object,
};

