export const formulaCollection = {
  'Mathematical Functions': [
    {
      name: 'Round',
      formula: 'Round(Value)',
      description: 'Rounds a given value to the nearest integer.',
    },
    {
      name: 'Round Up',
      formula: 'Ceiling(Value)',
      description: 'Rounds a given value up to the nearest integer.',
    },
    {
      name: 'Round Down',
      formula: 'Floor(Value)',
      description: 'Rounds a given value down to the nearest integer.',
    },
    {
      name: 'Cos',
      formula: 'Cos(Angle)',
      description: 'Calculates the cosine of an angle (in radians).',
    },
    {
      name: 'ArcCos',
      formula: 'ArcCos(Value)',
      description:
        'Calculates the arccosine of a value, returning an angle in radians.',
    },
    {
      name: 'Sin',
      formula: 'Sin(Angle)',
      description: 'Calculates the sine of an angle (in radians).',
    },
    {
      name: 'ArcSin',
      formula: 'ArcSin(Value)',
      description:
        'Calculates the arcsine of a value, returning an angle in radians.',
    },
    {
      name: 'Tan',
      formula: 'Tan(Angle)',
      description: 'Calculates the tangent of an angle (in radians).',
    },
    {
      name: 'ArcTan',
      formula: 'ArcTan(Value)',
      description:
        'Calculates the arctangent of a value, returning an angle in radians.',
    },
    {
      name: 'Log',
      formula: 'Log(Value)',
      description: 'Calculates the logarithm of a value with base 10.',
    },
    {
      name: 'Ln',
      formula: 'Ln(Value)',
      description: 'Calculates the natural logarithm of a value (base e).',
    },
    {
      name: 'Exp',
      formula: 'Exp(Value)',
      description: 'Calculates the exponential function e^x for a given value.',
    },
    {
      name: 'Sum',
      formula: 'Sum(Values)',
      description: 'Calculates the sum of a set of values.',
    },
    {
      name: 'Product',
      formula: 'Product(Values)',
      description: 'Calculates the product of a set of values.',
    },
    {
      name: 'Maximum',
      formula: 'Max(Values)',
      description: 'Returns the largest value in a set of values.',
    },
    {
      name: 'Minimum',
      formula: 'Min(Values)',
      description: 'Returns the smallest value in a set of values.',
    },
    {
      name: 'Mean',
      formula: 'Mean(Values)',
      description: 'Calculates the average of a set of values.',
    },
    {
      name: 'Median',
      formula: 'Median(Values)',
      description: 'Finds the median value in a set of values.',
    },
    {
      name: 'Standard Deviation',
      formula: 'StdDev(Values)',
      description: 'Calculates the standard deviation of a set of values.',
    },
    {
      name: 'Absolute Value',
      formula: 'Abs(Value)',
      description: 'Returns the absolute (non-negative) value of a number.',
    },
    {
      name: 'Mod',
      formula: '(Value One) mod (Value Two)',
      description: 'Finds the remainder of division between two numbers.',
    },
    {
      name: 'Square Root',
      formula: 'Sqrt(Value)',
      description: 'Calculates the square root of a number.',
    },
    {
      name: 'Sign',
      formula: 'Sign(Value)',
      description:
        'Returns the sign of a number: -1 for negative, 1 for positive, and 0 for zero.',
    },
    {
      name: 'Pi',
      formula: 'pi',
      description: 'Represents the constant π (approximately 3.14159).',
    },
    {
      name: 'e',
      formula: 'e',
      description: 'Represents the constant e (approximately 2.71828).',
    },
    {
      name: 'Logit',
      formula: 'Logit(Value)',
      description:
        'Computes the logit function for a value, typically used in logistic regression.',
    },
    {
      name: 'Expit',
      formula: 'Expit(Value)',
      description: 'Computes the expit (logistic) function for a value.',
    },
  ],
  'Time Functions': [
    {
      name: 'Seconds',
      formula: 'Seconds()',
      description: 'Returns the current time in seconds.',
    },
    {
      name: 'Minutes',
      formula: 'Minutes()',
      description: 'Returns the current time in minutes.',
    },
    {
      name: 'Hours',
      formula: 'Hours()',
      description: 'Returns the current time in hours.',
    },
    {
      name: 'Days',
      formula: 'Days()',
      description: 'Returns the current time in days.',
    },
    {
      name: 'Weeks',
      formula: 'Weeks()',
      description: 'Returns the current time in weeks.',
    },
    {
      name: 'Months',
      formula: 'Months()',
      description: 'Returns the current time in months.',
    },
    {
      name: 'Years',
      formula: 'Years()',
      description: 'Returns the current time in years.',
    },
    {
      name: 'Current Time',
      formula: 'Time()',
      description: 'Returns the exact current time.',
    },
    {
      name: 'Time Start',
      formula: 'TimeStart()',
      description: 'Marks the start time for a process or period.',
    },
    {
      name: 'Time Step',
      formula: 'TimeStep()',
      description: 'Defines a time step interval for time-based functions.',
    },
    {
      name: 'Time Length',
      formula: 'TimeLength()',
      description: 'Returns the duration of a period in specified units.',
    },
    {
      name: 'Time End',
      formula: 'TimeEnd()',
      description: 'Marks the end time for a process or period.',
    },
    {
      name: 'Seasonal',
      formula: 'Seasonal(Peak=0)',
      description: 'Generates a seasonal time series with a defined peak.',
    },
  ],
  'Historical Functions': [
    {
      name: 'Delay',
      formula: 'Delay([Primitive], Delay Length, Default Value)',
      description: 'Delays a value by a specified period.',
    },
    {
      name: 'Delay1',
      formula: 'Delay1([Value], Delay Length, Initial Value)',
      description: 'Creates a single delay by a specified period for a value.',
    },
    {
      name: 'Delay3',
      formula: 'Delay3([Value], Delay Length, Initial Value)',
      description:
        'Creates a three-stage delay by a specified period for a value.',
    },
    {
      name: 'DelayN',
      formula: 'DelayN([Value], Delay Length, Order, Initial Value)',
      description:
        'Creates a multi-stage delay with specified order and length.',
    },
    {
      name: 'Smooth',
      formula: 'Smooth([Value], Length, Initial Value)',
      description:
        'Applies a smoothing function to a value over a specified period.',
    },
    {
      name: 'SmoothN',
      formula: 'SmoothN([Value], Length, Order, Initial Value)',
      description:
        'Applies a multi-stage smoothing function with specified order and length.',
    },
    {
      name: 'PastValues',
      formula: 'PastValues([Primitive], Period = All Time)',
      description: 'Retrieves past values of a primitive over a given period.',
    },
    {
      name: 'Maximum',
      formula: 'PastMax([Primitive], Period = All Time)',
      description:
        'Returns the maximum value over a specified historical period.',
    },
    {
      name: 'Minimum',
      formula: 'PastMin([Primitive], Period = All Time)',
      description:
        'Returns the minimum value over a specified historical period.',
    },
    {
      name: 'Median',
      formula: 'PastMedian([Primitive], Period = All Time)',
      description:
        'Returns the median value over a specified historical period.',
    },
    {
      name: 'Mean',
      formula: 'PastMean([Primitive], Period = All Time)',
      description: 'Returns the mean value over a specified historical period.',
    },
    {
      name: 'Standard Deviation',
      formula: 'PastStdDev([Primitive], Period = All Time)',
      description:
        'Calculates the standard deviation over a specified historical period.',
    },
    {
      name: 'Correlation',
      formula: 'PastCorrelation([Primitive], [Primitive], Period = All Time)',
      description:
        'Calculates the correlation between two values over a specified period.',
    },
    {
      name: 'Fix',
      formula: 'Fix(Value, Period = All Time)',
      description: 'Fixes a value over a specified period.',
    },
  ],
  'Random Number Functions': [
    {
      name: 'Uniform Distribution',
      formula: 'Rand(Minimum, Maximum)',
      description:
        'Generates a random value within a specified uniform distribution range.',
    },
    {
      name: 'Normal Distribution',
      formula: 'RandNormal(Mean, Standard Deviation)',
      description:
        'Generates a random value with a specified mean and standard deviation.',
    },
    {
      name: 'Lognormal Distribution',
      formula: 'RandLognormal(Mean, Standard Deviation)',
      description:
        'Generates a random value from a lognormal distribution with specified parameters.',
    },
    {
      name: 'Binary Distribution',
      formula: 'RandBoolean(Probability)',
      description:
        'Generates a random true/false value based on a specified probability.',
    },
    {
      name: 'Binomial Distribution',
      formula: 'RandBinomial(Count, Probability)',
      description:
        'Generates a random value based on a binomial distribution with specified parameters.',
    },
    {
      name: 'Negative Binomial',
      formula: 'RandNegativeBinomial(Successes, Probability)',
      description:
        'Generates a random value from a negative binomial distribution with specified parameters.',
    },
    {
      name: 'Poisson Distribution',
      formula: 'RandPoisson(Lambda)',
      description:
        'Generates a random value from a Poisson distribution with specified lambda.',
    },
    {
      name: 'Triangular Distribution',
      formula: 'RandTriangular(Minimum, Maximum, Peak)',
      description: 'Generates a random value from a triangular distribution.',
    },
    {
      name: 'Exponential Distribution',
      formula: 'RandExp(Lambda)',
      description:
        'Generates a random value from an exponential distribution with specified lambda.',
    },
    {
      name: 'Gamma Distribution',
      formula: 'RandGamma(Alpha, Beta)',
      description:
        'Generates a random value from a gamma distribution with specified parameters.',
    },
    {
      name: 'Beta Distribution',
      formula: 'RandBeta(Alpha, Beta)',
      description:
        'Generates a random value from a beta distribution with specified parameters.',
    },
    {
      name: 'Custom Distribution',
      formula: 'RandDist(X, Y)',
      description:
        'Generates a random value based on a custom distribution defined by X and Y vectors.',
    },
    {
      name: 'SetRandSeed',
      formula: 'SetRandSeed(Seed)',
      description:
        'Sets the seed for random number generation to ensure reproducibility.',
    },
  ],
  'Agent Functions': [
    {
      name: 'Find All',
      formula: '[Agent Population].FindAll()',
      description: 'Finds all agents within a given population.',
    },
    {
      name: 'Find State',
      formula: '[Agent Population].FindState([State])',
      description: 'Finds agents with a specific state within a population.',
    },
    {
      name: 'Find Not State',
      formula: '[Agent Population].FindNotState([State])',
      description:
        'Finds agents that do not match a specified state within a population.',
    },
    {
      name: 'Find Index',
      formula: '[Agent Population].FindIndex(Index)',
      description: 'Finds an agent based on its index within a population.',
    },
    {
      name: 'Find Nearby',
      formula: '[Agent Population].FindNearby(Target, Distance)',
      description: 'Finds agents within a specified distance from a target.',
    },
    {
      name: 'Find Nearest',
      formula: '[Agent Population].FindNearest(Target, Count=1)',
      description: 'Finds the nearest agents to a specified target.',
    },
    {
      name: 'Find Furthest',
      formula: '[Agent Population].FindFurthest(Target, Count=1)',
      description: 'Finds the furthest agents from a specified target.',
    },
    {
      name: 'Value',
      formula: '[Agent Population].Value([Primitive])',
      description:
        'Retrieves the value of a specified attribute for agents in a population.',
    },
    {
      name: 'Set Value',
      formula: '[Agent Population].SetValue([Primitive], Value)',
      description:
        'Sets the value of a specified attribute for agents in a population.',
    },
    {
      name: 'Location',
      formula: '[Agent].Location()',
      description: 'Returns the location of an agent.',
    },
    {
      name: 'Set Location',
      formula: '[Agent].SetLocation(New Location)',
      description: 'Sets a new location for an agent.',
    },
    {
      name: 'Index',
      formula: '[Agent].Index()',
      description: 'Returns the index of an agent within a population.',
    },
    {
      name: 'Distance',
      formula: 'Distance(Location One, Location Two)',
      description: 'Calculates the distance between two locations.',
    },
    {
      name: 'Move',
      formula: '[Agent].Move({x, y})',
      description: 'Moves an agent to specified coordinates.',
    },
    {
      name: 'MoveTowards',
      formula: '[Agent].MoveTowards(Target, Distance)',
      description:
        'Moves an agent towards a specified target by a certain distance.',
    },
    {
      name: 'Connected',
      formula: '[Agent].Connected()',
      description: 'Checks if an agent is connected to other agents.',
    },
    {
      name: 'Connect',
      formula: '[Agent 1].Connect([Agent 2], Weight=1)',
      description:
        'Creates a connection between two agents with an optional weight.',
    },
    {
      name: 'Unconnect',
      formula: '[Agent 1].Unconnect([Agent 2])',
      description: 'Removes a connection between two agents.',
    },
    {
      name: 'Connection Weight',
      formula: '[Agent 1].ConnectionWeight([Agent 2])',
      description: 'Returns the weight of the connection between two agents.',
    },
    {
      name: 'Set Connection Weight',
      formula: '[Agent 1].SetConnectionWeight([Agent 2], Weight)',
      description: 'Sets the weight of the connection between two agents.',
    },
    {
      name: 'Population Size',
      formula: '[Agent Population].PopulationSize()',
      description: 'Returns the size of an agent population.',
    },
    {
      name: 'Add',
      formula: '[Agent Population].Add(Base Agent=Initial Agent)',
      description: 'Adds a new agent to the population based on a base agent.',
    },
    {
      name: 'Remove',
      formula: '[Agent].Remove()',
      description: 'Removes an agent from the population.',
    },
    {
      name: 'Width',
      formula: 'Width(Agent)',
      description: "Returns the width of an agent's representation.",
    },
    {
      name: 'Height',
      formula: 'Height(Agent)',
      description: "Returns the height of an agent's representation.",
    },
  ],
  'Vector Functions': [
    {
      name: 'Range',
      formula: 'Start:End',
      description: 'Defines a range from start to end.',
    },
    {
      name: 'Length',
      formula: 'Vector.Length()',
      description: 'Returns the length of a vector.',
    },
    {
      name: 'Select',
      formula: 'Vector{Selector}',
      description: 'Selects elements from a vector based on a condition.',
    },
    {
      name: 'Join',
      formula: 'Join(Item 1, Item 2, Item N)',
      description: 'Joins multiple items into a single vector.',
    },
    {
      name: 'Flatten',
      formula: 'Vector.Flatten()',
      description: 'Flattens nested vectors into a single vector.',
    },
    {
      name: 'Unique',
      formula: 'Vector.Unique()',
      description: 'Removes duplicate elements from a vector.',
    },
    {
      name: 'Union',
      formula: 'Vector.Union(Vector 2)',
      description: 'Combines two vectors into one with unique elements.',
    },
    {
      name: 'Intersection',
      formula: 'Vector.Intersection(Second Vector)',
      description: 'Returns elements that exist in both vectors.',
    },
    {
      name: 'Difference',
      formula: 'Vector.Difference(Vector 2)',
      description:
        'Returns elements that are in the first vector but not in the second.',
    },
    {
      name: 'Sort',
      formula: 'Vector.Sort()',
      description: 'Sorts elements in a vector in ascending order.',
    },
    {
      name: 'Reverse',
      formula: 'Vector.Reverse()',
      description: 'Reverses the order of elements in a vector.',
    },
    {
      name: 'Sample',
      formula: 'Vector.Sample(Sample Size, Allow Repeats=False)',
      description:
        'Selects a random sample from a vector with optional repeats.',
    },
    {
      name: 'IndexOf',
      formula: 'Vector.IndexOf(Needle)',
      description:
        'Returns the index of the first occurrence of a value in the vector.',
    },
    {
      name: 'Contains',
      formula: 'Vector.Contains(Needle)',
      description: 'Checks if a vector contains a specified value.',
    },
    {
      name: 'Repeat',
      formula: 'Repeat(Expression, Times)',
      description: 'Repeats an expression a specified number of times.',
    },
    {
      name: 'Map',
      formula: 'Vector.Map(Function)',
      description: 'Applies a function to each element in a vector.',
    },
    {
      name: 'Filter',
      formula: 'Vector.Filter(Function)',
      description: 'Filters a vector based on a condition.',
    },
    {
      name: 'Keys',
      formula: 'Vector.Keys()',
      description: 'Returns the keys from a vector of key-value pairs.',
    },
    {
      name: 'Values',
      formula: 'Vector.Values()',
      description: 'Returns the values from a vector of key-value pairs.',
    },
    {
      name: 'Lookup',
      formula: 'Lookup(Value, Values Vector, Results Vector)',
      description:
        'Finds a value in a lookup table and returns the corresponding result.',
    },
    {
      name: 'ConverterTable',
      formula: 'ConverterTable([Converter])',
      description:
        'Creates a table for converting values based on specified rules.',
    },
  ],
  'General Functions': [
    {
      name: 'If Then Else',
      formula: 'IfThenElse(Test Condition, Value if True, Value if False)',
      description: 'Executes one of two values based on a condition.',
    },
    {
      name: 'Pulse',
      formula: 'Pulse(Time, Height, Width=0, Repeat=-1)',
      description:
        'Generates a pulse signal with specified timing, height, and optional repeat.',
    },
    {
      name: 'Step',
      formula: 'Step(Start, Height=1)',
      description:
        'Generates a step function that jumps to a height at a specified start time.',
    },
    {
      name: 'Ramp',
      formula: 'Ramp(Start, Finish, Height=1)',
      description:
        'Creates a ramp function that linearly increases or decreases over time.',
    },
    {
      name: 'Pause',
      formula: 'Pause()',
      description: 'Pauses the execution of a process.',
    },
    {
      name: 'Stop',
      formula: 'Stop()',
      description: 'Stops the execution of a process.',
    },
  ],
  'String Functions': [
    {
      name: 'Length',
      formula: 'String.Length()',
      description: 'Returns the number of characters in a string.',
    },
    {
      name: 'Range',
      formula: 'String.Range(Characters)',
      description: 'Selects a range of characters from a string.',
    },
    {
      name: 'Split',
      formula: 'String.Split(Delimiter)',
      description: 'Splits a string into an array based on a delimiter.',
    },
    {
      name: 'IndexOf',
      formula: 'String.IndexOf(Needle)',
      description: 'Returns the index of a substring within a string.',
    },
    {
      name: 'Contains',
      formula: 'String.Contains(Needle)',
      description: 'Checks if a string contains a specified substring.',
    },
    {
      name: 'UpperCase',
      formula: 'String.UpperCase()',
      description: 'Converts a string to uppercase.',
    },
    {
      name: 'LowerCase',
      formula: 'String.LowerCase()',
      description: 'Converts a string to lowercase.',
    },
    {
      name: 'Join',
      formula: 'Vector.Join(String)',
      description: 'Joins elements of a vector into a single string.',
    },
    {
      name: 'Trim',
      formula: 'String.Trim()',
      description: 'Removes whitespace from both ends of a string.',
    },
    {
      name: 'Parse',
      formula: 'String.Parse()',
      description: 'Parses a string to extract relevant data.',
    },
  ],
  Programming: [
    {
      name: 'Variables',
      formula: 'Variable <- Value',
      description: 'Assigns a value to a variable.',
    },
    {
      name: 'If-Then-Else',
      formula:
        'If Condition Then Expression Else If Condition Then Expression Else Expression End If',
      description:
        'Executes different expressions based on multiple conditions.',
    },
    {
      name: 'While Loop',
      formula: 'While Condition Expression End Loop',
      description:
        'Executes an expression repeatedly while a condition is true.',
    },
    {
      name: 'For-In Loop',
      formula: 'For Variable in Vector Expression End Loop',
      description:
        'Iterates over each element in a vector and executes an expression.',
    },
    {
      name: 'Functions',
      formula: 'Function Name() Expression End Function',
      description: 'Defines a reusable block of code as a function.',
    },
    {
      name: 'Anonymous Functions',
      formula: 'Variable <- Function() Expression End Function',
      description: 'Defines an unnamed function and assigns it to a variable.',
    },
    {
      name: 'Anonymous Functions Single Line',
      formula: 'Function() Expression',
      description: 'Defines an anonymous function in a single line.',
    },
    {
      name: 'Throwing Errors',
      formula: "throw 'Message'",
      description: 'Throws an error with a specified message.',
    },
    {
      name: 'Error Handling',
      formula:
        'Try Expression Catch ErrorString Expression // Handle the error End Try',
      description:
        'Handles errors by executing a catch block if an error occurs in a try block.',
    },
  ],
  'User Input Functions': [
    {
      name: 'Alert',
      formula: 'Alert(Message)',
      description: 'Displays an alert message to the user.',
    },
    {
      name: 'Prompt',
      formula: "Prompt(Message, Default='')",
      description:
        'Prompts the user to input a response with an optional default.',
    },
    {
      name: 'Confirm',
      formula: 'Confirm(Message)',
      description:
        'Asks the user to confirm an action with a yes or no response.',
    },
  ],
  'Statistical Distributions': [
    {
      name: 'CDFNormal',
      formula: 'CDFNormal(x, Mean=0, Standard Deviation=1)',
      description:
        'Calculates the cumulative distribution function for a normal distribution.',
    },
    {
      name: 'PDFNormal',
      formula: 'PDFNormal(x, Mean=0, Standard Deviation=1)',
      description:
        'Calculates the probability density function for a normal distribution.',
    },
    {
      name: 'InvNormal',
      formula: 'InvNormal(p, Mean=0, Standard Deviation=1)',
      description:
        'Calculates the inverse cumulative distribution function for a normal distribution.',
    },
    {
      name: 'CDFLognormal',
      formula: 'CDFLognormal(x, Mean=0, Standard Deviation=1)',
      description:
        'Calculates the cumulative distribution function for a lognormal distribution.',
    },
    {
      name: 'PDFLognormal',
      formula: 'PDFLognormal(x, Mean=0, Standard Deviation=1)',
      description:
        'Calculates the probability density function for a lognormal distribution.',
    },
    {
      name: 'InvLognormal',
      formula: 'InvLognormal(p, Mean=0, Standard Deviation=1)',
      description:
        'Calculates the inverse cumulative distribution function for a lognormal distribution.',
    },
    {
      name: 'CDFt',
      formula: 'CDFt(x, Degrees Of Freedom)',
      description:
        'Calculates the cumulative distribution function for a t-distribution.',
    },
    {
      name: 'PDFt',
      formula: 'PDFt(x, Degrees Of Freedom)',
      description:
        'Calculates the probability density function for a t-distribution.',
    },
    {
      name: 'Invt',
      formula: 'Invt(p, Degrees Of Freedom)',
      description:
        'Calculates the inverse cumulative distribution function for a t-distribution.',
    },
    {
      name: 'CDFF',
      formula: 'CDFF(x, Degrees Of Freedom1, Degrees Of Freedom2)',
      description:
        'Calculates the cumulative distribution function for an F-distribution.',
    },
    {
      name: 'PDFF',
      formula: 'PDFF(x, Degrees Of Freedom1, Degrees Of Freedom2)',
      description:
        'Calculates the probability density function for an F-distribution.',
    },
    {
      name: 'InvF',
      formula: 'InvF(p, Degrees Of Freedom1, Degrees Of Freedom2) ',
      description:
        'Calculates the inverse cumulative distribution function for an F-distribution.',
    },
    {
      name: 'CDFChiSquared',
      formula: 'CDFChiSquared(x, Degrees Of Freedom)',
      description:
        'Calculates the cumulative distribution function for a chi-squared distribution.',
    },
    {
      name: 'PDFChiSquared',
      formula: 'PDFChiSquared(x, Degrees Of Freedom)',
      description:
        'Calculates the probability density function for a chi-squared distribution.',
    },
    {
      name: 'InvChiSquared',
      formula: 'InvChiSquared(p, Degrees Of Freedom)',
      description:
        'Calculates the inverse cumulative distribution function for a chi-squared distribution.',
    },
    {
      name: 'CDFExponential',
      formula: 'CDFExponential(x, Rate)',
      description:
        'Calculates the cumulative distribution function for an exponential distribution.',
    },
    {
      name: 'PDFExponential',
      formula: 'PDFExponential(x, Rate)',
      description:
        'Calculates the probability density function for an exponential distribution.',
    },
    {
      name: 'InvExponential',
      formula: 'InvExponential(p, Rate)',
      description:
        'Calculates the inverse cumulative distribution function for an exponential distribution.',
    },
    {
      name: 'CDFPoisson',
      formula: 'CDFPoisson(x, Lambda)',
      description:
        'Calculates the cumulative distribution function for a Poisson distribution.',
    },
    {
      name: 'PMFPoisson',
      formula: 'PMFPoisson(x, Lambda)',
      description:
        'Calculates the probability mass function for a Poisson distribution.',
    },
  ],
};
