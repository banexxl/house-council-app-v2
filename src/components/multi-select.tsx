import type { ChangeEvent, FC } from 'react';
import { useCallback } from 'react';
import PropTypes from 'prop-types';
import ChevronDownIcon from '@untitled-ui/icons-react/build/esm/ChevronDown';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import SvgIcon from '@mui/material/SvgIcon';

import { usePopover } from 'src/hooks/use-popover';
import { useTranslation } from 'react-i18next';

interface MultiSelectProps {
  label: string;
  options: { resource_string: string; value: string }[];
  value: string[];
  onChange?: (value: string[]) => void;
  single?: boolean;
}

export const MultiSelect: FC<MultiSelectProps> = ({
  label,
  options,
  value = [],
  onChange,
  single = false,
  ...other
}) => {
  const popover = usePopover<HTMLButtonElement>();
  const { t } = useTranslation();

  const handleValueChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      const selectedValue = event.target.value;
      let newValue: string[];

      if (single) {
        // Only allow one value at a time
        newValue = event.target.checked ? [selectedValue] : [];
      } else {
        // Multi-select logic
        newValue = [...value];
        if (event.target.checked) {
          newValue.push(selectedValue);
        } else {
          newValue = newValue.filter((item) => item !== selectedValue);
        }
      }

      onChange?.(newValue);
    },
    [onChange, value, single]
  );

  return (
    <>
      <Button
        color="inherit"
        endIcon={
          <SvgIcon>
            <ChevronDownIcon />
          </SvgIcon>
        }
        onClick={popover.handleOpen}
        ref={popover.anchorRef}
        {...other}
      >
        {t(label)}
      </Button>
      <Menu
        anchorEl={popover.anchorRef.current}
        onClose={popover.handleClose}
        open={popover.open}
        PaperProps={{ style: { width: 250 } }}
      >
        {options.map((option) => (
          <MenuItem key={option.value}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={value.includes(option.value)}
                  onChange={handleValueChange}
                  value={option.value}
                />
              }
              label={t(option.resource_string)}
              sx={{ flexGrow: 1, mr: 0 }}
            />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

MultiSelect.propTypes = {
  label: PropTypes.string.isRequired,
  options: PropTypes.array.isRequired,
  value: PropTypes.array.isRequired,
  onChange: PropTypes.func,
  single: PropTypes.bool,
};
