import React, {
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { ThemeContext } from 'styled-components';
import { FormUp } from 'grommet-icons/icons/FormUp';

import { setFocusWithoutScroll } from '../../utils';

import { defaultProps } from '../../default-props';

import { Box } from '../Box';
import { Button } from '../Button';
import { CheckBox } from '../CheckBox';
import { InfiniteScroll } from '../InfiniteScroll';
import { Keyboard } from '../Keyboard';
import { Text } from '../Text';
import { TextInput } from '../TextInput';
import { SelectionSummary } from './SelectionSummary';
import {
  StyledContainer,
  OptionsContainer,
  SelectOption,
} from '../Select/StyledSelect';
import {
  applyKey,
  getOptionLabel,
  getOptionValue,
  useDisabled,
} from '../Select/utils';
import { EmptySearchOption } from '../Select/EmptySearchOption';

const SelectMultipleContainer = forwardRef(
  (
    {
      allOptions,
      children = null,
      disabled: disabledProp,
      disabledKey,
      dropHeight,
      emptySearchMessage = 'No matches found',
      help,
      id,
      labelKey,
      limit,
      onChange,
      onClose,
      onKeyDown,
      onMore,
      onSearch,
      optionIndexesInValue,
      options,
      replace = true,
      searchPlaceholder,
      search,
      setSearch,
      usingKeyboard,
      value = [],
      valueKey,
      showSelectedInline,
    },
    ref,
  ) => {
    const theme = useContext(ThemeContext) || defaultProps.theme;
    const [activeIndex, setActiveIndex] = useState(-1);
    const [keyboardNavigation, setKeyboardNavigation] = useState(usingKeyboard);
    const searchRef = useRef();
    const optionsRef = useRef();
    const [disabled, setDisabled] = useState(disabledProp);
    const activeRef = useRef();
    const [showA11yLimit, setShowA11yLimit] = useState();
    const clearRef = useRef();
    const isDisabled = useDisabled(
      disabled,
      disabledKey,
      options,
      valueKey || labelKey,
    );

    // for keyboard/screenreader, keep the active option in focus
    useEffect(() => {
      if (activeIndex) activeRef.current?.focus();
    }, [activeIndex]);

    // set initial focus
    useEffect(() => {
      // need to wait for Drop to be ready
      const timer = setTimeout(() => {
        const clearButton = clearRef.current;
        if (clearButton && clearButton.focus) {
          setFocusWithoutScroll(clearButton);
        } else if (searchRef && searchRef.current) {
          const searchInput = searchRef.current;
          if (searchInput && searchInput.focus) {
            setFocusWithoutScroll(searchInput);
          }
        } else if (activeRef.current) {
          setFocusWithoutScroll(activeRef.current);
        } else if (optionsRef.current) {
          setActiveIndex(0);
        }
      }, 100); // Drop should be open after 100ms
      return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
      const optionsNode = optionsRef.current;
      if (optionsNode.children) {
        const optionNode = optionsNode.children[activeIndex];
        if (optionNode) optionNode.focus();
      }
    }, [activeIndex]);

    const isSelected = useCallback(
      (index) => {
        let result;
        const optionVal = getOptionValue(index, options, valueKey || labelKey);
        if (value) {
          if (value.length === 0) {
            result = false;
          } else if (typeof value[0] !== 'object') {
            result = value.indexOf(optionVal) !== -1;
          } else if (valueKey) {
            result = value.some((valueItem) => {
              const valueValue =
                typeof valueKey === 'function'
                  ? valueKey(valueItem)
                  : valueItem[valueKey];
              return valueValue === optionVal;
            });
          }
        }
        return result;
      },
      [value, valueKey, options, labelKey],
    );

    const selectOption = useCallback(
      (index) => (event) => {
        if (onChange) {
          const nextOptionIndexesInValue = optionIndexesInValue.slice(0);
          const allOptionsIndex = allOptions.indexOf(options[index]);
          const valueIndex = optionIndexesInValue.indexOf(allOptionsIndex);
          if (valueIndex === -1 && (!limit || value?.length < limit)) {
            nextOptionIndexesInValue.push(allOptionsIndex);
          } else {
            nextOptionIndexesInValue.splice(valueIndex, 1);
          }
          const nextValue = nextOptionIndexesInValue.map((i) =>
            valueKey && valueKey.reduce
              ? applyKey(allOptions[i], valueKey)
              : allOptions[i],
          );
          const nextSelected = nextOptionIndexesInValue;
          onChange(event, {
            option: options[index],
            value: nextValue,
            selected: nextSelected,
          });
        }
      },
      [
        limit,
        onChange,
        optionIndexesInValue,
        options,
        allOptions,
        valueKey,
        value,
      ],
    );

    const onNextOption = useCallback(
      (event) => {
        event.preventDefault();
        const nextActiveIndex = activeIndex + 1;
        if (nextActiveIndex !== options.length) {
          setActiveIndex(nextActiveIndex);
          setKeyboardNavigation(true);
        }
      },
      [activeIndex, options],
    );

    const onPreviousOption = useCallback(
      (event) => {
        event.preventDefault();
        const nextActiveIndex = activeIndex - 1;

        if (nextActiveIndex === -1) {
          const searchInput = searchRef.current;
          if (searchInput && searchInput.focus) {
            setActiveIndex(nextActiveIndex);
            setFocusWithoutScroll(searchInput);
          }
        }

        if (nextActiveIndex >= 0) {
          setActiveIndex(nextActiveIndex);
          setKeyboardNavigation(true);
        }
      },
      [activeIndex],
    );

    const onKeyDownOption = useCallback(
      (event) => {
        if (!onSearch) {
          const nextActiveIndex = options.findIndex((e) => {
            let label;
            if (typeof e === 'object') {
              label = e.label || applyKey(e, labelKey);
            } else {
              label = e;
            }
            return (
              typeof label === 'string' &&
              label.charAt(0).toLowerCase() === event.key.toLowerCase()
            );
          });

          if (nextActiveIndex >= 0) {
            event.preventDefault();
            setActiveIndex(nextActiveIndex);
            setKeyboardNavigation(true);
          }
        }
        if (onKeyDown) {
          onKeyDown(event);
        }
      },
      [onKeyDown, options, onSearch, labelKey],
    );

    const onActiveOption = useCallback(
      (index) => () => {
        if (!keyboardNavigation) setActiveIndex(index);
      },
      [keyboardNavigation],
    );

    const onSelectOption = useCallback(
      (event) => {
        if (
          !isDisabled(activeIndex) &&
          activeIndex >= 0 &&
          activeIndex < options.length
        ) {
          event.preventDefault(); // prevent submitting forms
          selectOption(activeIndex)(event);
        }
      },
      [activeIndex, selectOption, options, isDisabled],
    );

    const customSearchInput = theme.select.searchInput;
    const SelectTextInput = customSearchInput || TextInput;
    const selectOptionsStyle = theme.select.options
      ? {
          ...theme.select.options.box,
          ...theme.select.options.container,
        }
      : {};

    // handle when limit is reached
    useEffect(() => {
      const originallyDisabled = (index) => {
        const option = allOptions[index];
        let result;
        if (disabledKey) {
          result = applyKey(option, disabledKey);
        } else if (Array.isArray(disabledProp)) {
          if (typeof disabledProp[0] === 'number') {
            result = disabledProp.indexOf(index) !== -1;
          } else {
            result =
              disabledProp.indexOf(
                getOptionValue(index, options, valueKey || labelKey),
              ) !== -1;
          }
        }
        return result;
      };

      if (value && limit) {
        if (value.length === limit) {
          const newDisabled = [...disabledProp];
          // disable everything that is not selected
          for (let i = 0; i < options.length; i += 1) {
            if (!isSelected(i) && !originallyDisabled(i)) {
              newDisabled.push(options[i]);
            }
          }
          if (usingKeyboard)
            setShowA11yLimit('Selected. Maximum selection limit reached.');
          setDisabled(newDisabled);
        } else {
          if (usingKeyboard) setShowA11yLimit(undefined);
          setDisabled(disabledProp);
        }
      }
    }, [
      isSelected,
      value,
      limit,
      disabledProp,
      allOptions,
      disabledKey,
      labelKey,
      options,
      usingKeyboard,
      valueKey,
    ]);

    // reset showA11yLimit after announcement is read
    useEffect(() => {
      if (showA11yLimit !== undefined) {
        setTimeout(() => {
          setShowA11yLimit(undefined);
        }, 2000); // value chosen based on length of a11yLimit message
      }
    }, [showA11yLimit]);

    let summaryContent = (
      <SelectionSummary
        allOptions={allOptions}
        clearRef={clearRef}
        disabled={disabled}
        disabledKey={disabledKey}
        isSelected={isSelected}
        labelKey={labelKey}
        limit={limit}
        onChange={onChange}
        onMore={onMore}
        options={options}
        search={search}
        setActiveIndex={setActiveIndex}
        showSelectedInline={showSelectedInline}
        value={value}
        valueKey={valueKey}
      />
    );

    if (showSelectedInline)
      summaryContent = (
        <Box direction="row" justify="between" flex={false}>
          {summaryContent}
          <Button onClick={onClose} a11yTitle="Close Select">
            <Box fill alignSelf="start" pad={{ right: 'small', top: 'small' }}>
              <FormUp />
            </Box>
          </Button>
        </Box>
      );

    return (
      <Keyboard
        onEnter={onSelectOption}
        onSpace={onSelectOption}
        onUp={onPreviousOption}
        onDown={onNextOption}
        onKeyDown={onKeyDownOption}
        onEsc={onClose}
      >
        <StyledContainer
          ref={ref}
          as={Box}
          id={id ? `${id}__select-drop` : undefined}
          dropHeight={dropHeight}
          a11yTitle="Select dropdown"
        >
          {summaryContent}
          {onSearch && (
            <Box pad={!customSearchInput ? 'xsmall' : undefined} flex={false}>
              <Keyboard
                onEnter={(event) => {
                  onNextOption(event);
                }}
              >
                <SelectTextInput
                  a11yTitle="Search to filter options."
                  focusIndicator={!customSearchInput}
                  size="small"
                  ref={searchRef}
                  type="search"
                  value={search || ''}
                  placeholder={searchPlaceholder}
                  onChange={(event) => {
                    const nextSearch = event.target.value;
                    setSearch(nextSearch);
                    setActiveIndex(-1);
                    onSearch(nextSearch);
                  }}
                />
              </Keyboard>
            </Box>
          )}
          <Box flex={false}>{help}</Box>
          <OptionsContainer
            role="listbox"
            tabIndex="0"
            ref={optionsRef}
            aria-multiselectable
            onMouseMove={() => setKeyboardNavigation(false)}
            aria-activedescendant={optionsRef?.current?.children[activeIndex]}
          >
            {options.length > 0 ? (
              <InfiniteScroll
                items={options}
                step={theme.select.step}
                onMore={onMore}
                replace={replace}
                show={activeIndex !== -1 ? activeIndex : undefined}
              >
                {(option, index, optionRef) => {
                  const optionDisabled = isDisabled(index);
                  const optionSelected = value
                    ? value.includes(
                        valueKey && valueKey.reduce
                          ? applyKey(option, valueKey)
                          : option,
                      )
                    : false;
                  const optionActive = activeIndex === index;
                  const optionLabel = getOptionLabel(
                    index,
                    options,
                    labelKey || valueKey,
                  );

                  // Determine whether the label is done as a child or
                  // as an option Button kind property.
                  let child;
                  let textComponent = false;
                  if (children) {
                    child = children(option, index, options, {
                      active: optionActive,
                      disabled: optionDisabled,
                      selected: optionSelected,
                    });
                    if (
                      typeof child === 'string' ||
                      (child.props &&
                        child.props.children &&
                        typeof child.props.children === 'string')
                    )
                      textComponent = true;
                  } else {
                    child = (
                      <CheckBox
                        label={
                          <Box alignSelf="center" width="100%" align="start">
                            {optionLabel}
                          </Box>
                        }
                        pad="xsmall"
                        tabIndex="-1"
                        checked={optionSelected}
                        disabled={optionDisabled}
                      />
                    );
                  }

                  if (!children && search) {
                    const searchText = search.toLowerCase();
                    if (
                      typeof optionLabel === 'string' &&
                      optionLabel.toLowerCase().indexOf(searchText) >= 0
                    ) {
                      // code to bold search term in matching options
                      const boldIndex = optionLabel
                        .toLowerCase()
                        .indexOf(searchText);
                      const childBeginning = optionLabel.substring(
                        0,
                        boldIndex,
                      );
                      let childBold = optionLabel.substring(
                        boldIndex,
                        boldIndex + searchText.length,
                      );
                      childBold = <b>{childBold}</b>;
                      const childEnd = optionLabel.substring(
                        boldIndex + searchText.length,
                      );
                      child = (
                        <CheckBox
                          label={
                            <Box
                              alignSelf="center"
                              width="100%"
                              align="start"
                              direction="row"
                            >
                              <Text>
                                {childBeginning}
                                {childBold}
                                {childEnd}
                              </Text>
                            </Box>
                          }
                          pad="xsmall"
                          tabIndex="-1"
                          checked={optionSelected}
                          disabled={optionDisabled}
                        />
                      );
                    }
                  }

                  // if we have a child, turn on plain, and hoverIndicator
                  return (
                    <SelectOption
                      a11yTitle={
                        optionSelected
                          ? `${optionLabel} selected`
                          : `${optionLabel} not selected`
                      }
                      // eslint-disable-next-line react/no-array-index-key
                      key={index}
                      // merge optionRef and activeRef
                      ref={(node) => {
                        // eslint-disable-next-line no-param-reassign
                        if (optionRef) optionRef.current = node;
                        if (optionActive) activeRef.current = node;
                      }}
                      tabIndex={optionSelected ? '0' : '-1'}
                      role="option"
                      id={`option${index}`}
                      aria-setsize={options.length}
                      aria-posinset={index + 1}
                      aria-selected={optionSelected}
                      focusIndicator={false}
                      aria-disabled={optionDisabled || undefined}
                      plain={!child ? undefined : true}
                      align="start"
                      kind={!child ? 'option' : undefined}
                      active={optionActive}
                      selected={optionSelected}
                      onMouseOver={
                        !optionDisabled ? onActiveOption(index) : undefined
                      }
                      onClick={
                        !optionDisabled ? selectOption(index) : undefined
                      }
                      onFocus={() => setActiveIndex(index)}
                      textComponent={textComponent}
                    >
                      {child}
                    </SelectOption>
                  );
                }}
              </InfiniteScroll>
            ) : (
              <EmptySearchOption
                emptySearchMessage={emptySearchMessage}
                selectOptionsStyle={selectOptionsStyle}
                theme={theme}
              />
            )}
          </OptionsContainer>
          {usingKeyboard && showA11yLimit && (
            <Box
              height="0px"
              width="0px"
              overflow="hidden"
              // announce when we reach the limit of items
              // that can be selected
              aria-live="assertive"
              role="alert"
            >
              {showA11yLimit}
            </Box>
          )}
        </StyledContainer>
      </Keyboard>
    );
  },
);

export { SelectMultipleContainer };
